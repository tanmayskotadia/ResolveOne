import os
from pathlib import Path
from functools import lru_cache
import numpy as np
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer
import onnxruntime as ort

REPO = "Xenova/multilingual-e5-small"
REVISION = Path(__file__).with_name('model_revision.txt').read_text().strip()
CACHE = str(Path(__file__).with_name('.cache'))

def download():
    return [hf_hub_download(REPO, name, revision=REVISION, cache_dir=CACHE)
            for name in ('tokenizer.json','onnx/model_quantized.onnx')]

@lru_cache(maxsize=1)
def load():
    tokenizer_path, model_path = download()
    options = ort.SessionOptions()
    options.enable_cpu_mem_arena = False
    options.enable_mem_pattern = False
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL
    options.add_session_config_entry('session.disable_prepacking','1')
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(model_path, options, providers=['CPUExecutionProvider'])
    # Load tokenizer after ONNX graph initialization to avoid overlapping peaks.
    tokenizer = Tokenizer.from_file(tokenizer_path)
    tokenizer.enable_truncation(max_length=128)
    tokenizer.enable_padding(length=None)
    return tokenizer, session

@lru_cache(maxsize=256)
def encode(text):
    tokenizer, session = load()
    item = tokenizer.encode('query: '+text)
    available = {'input_ids':np.array([item.ids],dtype=np.int64),
      'attention_mask':np.array([item.attention_mask],dtype=np.int64),
      'token_type_ids':np.array([item.type_ids],dtype=np.int64)}
    output = session.run(None,{key.name:available[key.name] for key in session.get_inputs()})[0]
    mask = available['attention_mask'][...,None]
    vector = (output*mask).sum(axis=1)[0]/max(1,mask.sum())
    return vector/max(float(np.linalg.norm(vector)),1e-12)

if __name__ == '__main__':
    download()
