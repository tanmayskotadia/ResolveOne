"""Downloads and exercises real pretrained weights; run separately from unit tests."""
from pathlib import Path
from PIL import Image
from models import classify_text, classify_image, embeddings

for text in ['Garbage is overflowing from the dustbin near my house.',
             'There is a deep pothole in the main road.',
             'सड़क पर बहुत बड़ा गड्ढा है।']:
    result = classify_text(text)
    print('Text:', result['suggestions'][0], 'uncertain:', result['uncertain'])

vectors = embeddings(['A deep pothole on the main road', 'The main road has a large pothole', 'A streetlight is broken'])
print('Duplicate similarity:', float(vectors[0] @ vectors[1]), 'unrelated:', float(vectors[0] @ vectors[2]))
root = Path(__file__).resolve().parents[2]
for filename in ['damaged road.webp', 'garbage.jpg']:
    path = root / filename
    if path.exists():
        result = classify_image(Image.open(path).convert('RGB'))
        print('Photo:', filename, result['suggestions'][0], 'uncertain:', result['uncertain'])
