"""Checks the actual Vite proxy -> Python API -> pretrained model boundary."""
from pathlib import Path
import httpx

with httpx.Client(base_url='http://127.0.0.1:5173/api/ml', timeout=180) as client:
    response = client.get('/health')
    response.raise_for_status()
    print('Proxy health:', response.json())
    response = client.post('/classify/text', json={'description': 'There is a large pothole in the main road.'})
    response.raise_for_status()
    assert response.json()['suggestions'][0]['category'] == 'Road Damage/Potholes'
    print('HTTP text classification:', response.json()['suggestions'][0]['category'])
    image = Path(__file__).resolve().parents[2] / 'garbage.jpg'
    if image.exists():
        with image.open('rb') as file:
            response = client.post('/classify/photo', files={'file': ('garbage.jpg', file, 'image/jpeg')})
        response.raise_for_status()
        assert response.json()['suggestions'][0]['category'] == 'Garbage/Waste'
        print('HTTP image classification:', response.json()['suggestions'][0]['category'])
    response = client.get('/insights')
    assert response.status_code == 401
    print('HTTP unauthenticated insights: correctly rejected')
