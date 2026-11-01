"""Stateless multilingual matching. Never generates or rewrites complaints."""
import re
import time
from datetime import datetime,timezone
from collections import defaultdict,deque
from contextlib import asynccontextmanager
from math import sin,cos,radians,asin,sqrt,isfinite
from threading import Lock
from typing import Literal
from fastapi import FastAPI,HTTPException,Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel,Field,ConfigDict
import numpy as np
from encoder import encode,load,REVISION

@asynccontextmanager
async def lifespan(app):
    load()
    encode('A broken road needs repair')
    yield

app=FastAPI(lifespan=lifespan,docs_url=None,redoc_url=None)
lock=Lock()
rate_lock=Lock()
events=defaultdict(deque)

@app.middleware('http')
async def limits(request:Request,call_next):
    if request.url.path != '/health':
        try: declared=int(request.headers.get('content-length','0') or 0)
        except ValueError: return JSONResponse({'detail':'Invalid content length'},400)
        if declared>600000:
            return JSONResponse({'detail':'Request too large'},413)
        now=time.monotonic()
        with rate_lock:
            # Render's reverse proxy supplies this header. Rate limiting is advisory;
            # the Supabase gateway also bounds requests and candidate counts.
            key=request.client.host if request.client else 'unknown'
            if len(events)>1000:
                for k in list(events):
                    if not events[k] or events[k][-1]<now-60: del events[k]
            bucket=events[key]
            while bucket and bucket[0]<now-60: bucket.popleft()
            if len(bucket)>=60: return JSONResponse({'detail':'Try again later'},429)
            bucket.append(now)
        body=bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body)>600000: return JSONResponse({'detail':'Request too large'},413)
        request._body=bytes(body)
    return await call_next(request)

class Candidate(BaseModel):
    model_config=ConfigDict(extra='ignore')
    id:str=Field(max_length=64)
    description:str=Field(max_length=4000)
    category:str=Field(max_length=100)
    status:str=Field(max_length=30)
    lat:float=Field(ge=-90,le=90,allow_inf_nan=False)
    lng:float=Field(ge=-180,le=180,allow_inf_nan=False)
    created_at:datetime

class Check(BaseModel):
    description:str=Field(min_length=1,max_length=4000)
    lat:float=Field(ge=-90,le=90,allow_inf_nan=False)
    lng:float=Field(ge=-180,le=180,allow_inf_nan=False)
    candidates:list[Candidate]=Field(max_length=100)

CIVIC=[
 'A damaged road has dangerous potholes and needs repairs',
 'Garbage has been dumped in the street and needs cleaning',
 'The streetlight is broken and the road is dark at night',
 'A water supply pipe is leaking and needs repairs',
 'A blocked drain is overflowing with sewage',
 'There is a power outage or a dangerous exposed electric wire',
 'A public bench footpath park or bus shelter is damaged',
]
SPAM=['Buy now cheap products special offer discount click this link earn money',
 'Subscribe to my channel follow me for advertisements win a free prize',
 'Hello good morning how are you I am just testing this website']

def quality(text):
    text=text.strip()
    letters=[c for c in text if c.isalpha()]
    if len(letters)<8 or len(set(letters))<4 or re.search(r'(.)\1{7,}',text): return 'unclear'
    if len(re.findall(r'https?://',text))>=2: return 'unclear'
    v=encode(text)
    civic=max(float(v@encode(p)) for p in CIVIC)
    spam=max(float(v@encode(p)) for p in SPAM)
    if civic<0.68 or (spam>0.80 and spam>civic+0.04): return 'unclear'
    return 'usable'

def distance(a,b):
    v=sin(radians(a.lat-b.lat)/2)**2+cos(radians(a.lat))*cos(radians(b.lat))*sin(radians(a.lng-b.lng)/2)**2
    return 2*6371000*asin(sqrt(min(1,max(0,v))))

TOPICS={
 'road_damage':r'pothol|large holes|deep holes|broken asphalt|damaged road|गड्ढ|खड्ड|खराब सड़क|பள்ளங்|பள்ளம்|குண்டு|గుంత|ખાડ|ರಸ್ತೆ.*ಗುಂಡಿ|കുഴി',
 'traffic':r'traffic jam|congestion|parking|यातायात|போக்குவரத்து நெரிசல்|ట్రాఫిక్|ટ્રાફિક',
 'water_leak':r'leak|burst pipe|पानी.*रिस|கசிவு|లీక్|લીક',
 'water_supply':r'no water|water supply|drinking water|पानी.*नहीं|தண்ணீர்.*வரவில்லை|నీరు.*రావడం',
 'drain':r'sewage|sewer|blocked drain|नाली|सीवर|சாக்கடை|கழிவுநீர்|మురుగు|ગટર',
 'waste':r'garbage|rubbish|trash|litter|कचरा|குப்பை|చెత్త|કચરો',
 'light':r'street.?light|street lamp|lamp post|स्ट्रीट लाइट|सड़क.*बत्ती|தெரு.*விளக்கு|వీధి.*దీప|સ્ટ્રીટ.*લાઇટ',
 'power':r'power outage|electric|exposed wire|बिजली|மின்சாரம்|విద్యుత్|વીજળી',
 'paint':r'paint|renovat|पुताई|வண்ணம்',
 'footpath':r'footpath|sidewalk|pavement|फुटपाथ|நடைபாதை',
 'public_fixture':r'bench|bus shelter|public park|बेंच|பூங்கா',
}
def topics(text):
 return {topic for topic,pattern in TOPICS.items() if re.search(pattern,text,re.I)}

def positive_negation_conflict(a,b):
    # Embeddings alone can confuse 'working' with 'not working'. Abstain on
    # clearly positive English descriptions; never claim to verify reality.
    positive=r'\b(?:no (?:potholes?|garbage|leak(?:age)?|problem|damage)|(?:light|lights|road|pipe) (?:is |are )?(?:working (?:fine|properly)|in good condition)|(?:repaired|fixed) successfully)\b'
    return bool(re.search(positive,a,re.I)) != bool(re.search(positive,b,re.I))

@app.get('/health')
def health(): return {'status':'ready','model':'multilingual-e5-small-int8','revision':REVISION}

@app.post('/match')
def match(data:Check):
    with lock:
        state=quality(data.description)
        if state!='usable': return {'quality':state,'matches':[]}
        now=datetime.now(timezone.utc)
        query=encode(data.description)
        matches=[]
        for row in data.candidates:
            if row.created_at.tzinfo is None: continue
            age=(now-row.created_at).total_seconds()/86400
            metres=distance(data,row)
            if row.status in ('resolved','rejected') or not 0<=age<=30 or metres>250: continue
            if quality(row.description)!='usable' or positive_negation_conflict(data.description,row.description): continue
            query_topics,candidate_topics=topics(data.description),topics(row.description)
            if query_topics and candidate_topics and not query_topics.intersection(candidate_topics): continue
            similarity=float(query@encode(row.description))
            if (not query_topics or not candidate_topics) and similarity<0.90: continue
            if not isfinite(similarity) or similarity<0.84: continue
            # Semantic score dominates; small tie breakers prefer nearer/newer issues.
            rank=similarity+0.015*(1-metres/250)+0.005*(1-age/30)
            matches.append({'id':row.id,'score':round(similarity,4),'rank':rank})
        matches.sort(key=lambda r:(-r['rank'],r['id']))
        return {'quality':'usable','matches':[{'id':r['id'],'score':r['score']} for r in matches[:3]]}
