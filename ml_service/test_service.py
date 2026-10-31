import io
from datetime import datetime, timedelta, timezone

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app as service
from core import CATEGORIES, completed_samples, distance_m, historical_estimate, hotspots, located
from models import rank


@pytest.fixture(autouse=True)
def isolate(monkeypatch, tmp_path):
    service.buckets.clear()
    monkeypatch.setenv('MODEL_DIR', str(tmp_path))
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_ANON_KEY', 'public-test-key')
    monkeypatch.delenv('SUPABASE_SERVICE_ROLE_KEY', raising=False)
    service.app.dependency_overrides.clear()
    yield
    service.app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(service.app)


def row(index=0, category=CATEGORIES[0], **updates):
    return {'id': str(index), 'category': category, 'description': 'A pile of rubbish on the road',
            'complaint_code': f'CC-2026-{index:05}', 'status': 'submitted', 'lat': 23.02 + index * .0001,
            'lng': 72.57, 'created_at': datetime.now(timezone.utc).isoformat(), **updates}


def samples(count=60):
    start = datetime(2025, 1, 1, tzinfo=timezone.utc)
    rows, history = [], []
    for i in range(count):
        created = start + timedelta(days=i * 3)
        report = row(i, category=CATEGORIES[i % 3], status='resolved', created_at=created.isoformat())
        rows.append(report)
        history.append({'complaint_id': report['id'], 'status': 'resolved',
                        'changed_at': (created + timedelta(hours=4 + i % 8)).isoformat()})
    return rows, completed_samples(rows, history)


def test_coordinates_and_distance():
    assert located(row(lat=0, lng=0))
    assert not located(row(lat=float('nan')))
    assert not located(row(lng=181))
    assert not located(row(lat=None))
    assert distance_m(0, 0, 0, 0) == 0
    assert 110 < distance_m(0, 0, .001, 0) < 112


def test_hotspots_separate_categories_and_exclude_closed_old_missing():
    rows = [row(i) for i in range(3)] + [row(10, category=CATEGORIES[1]), row(11, status='resolved'),
            row(12, lat=None), row(13, created_at='2020-01-01T00:00:00Z')]
    result = hotspots(rows)
    assert len(result) == 1
    assert result[0]['count'] == 3
    assert set(result[0]['complaint_ids']) == {'0', '1', '2'}


def test_hotspots_dont_merge_far_apart():
    assert hotspots([row(i, lat=23 + i) for i in range(4)]) == []


def test_resolution_labels_ignore_notes_and_use_reopened_transition():
    rows = [row(0, status='resolved', created_at='2026-01-01T00:00:00Z'), row(1, status='resolved')]
    history = [
        {'complaint_id': '0', 'status': 'resolved', 'changed_at': '2026-01-02T00:00:00Z'},
        {'complaint_id': '0', 'status': 'resolved', 'changed_at': '2026-01-03T00:00:00Z'},
    ]
    assert completed_samples(rows, history)[0][1] == 24
    history += [{'complaint_id': '0', 'status': 'in-progress', 'changed_at': '2026-01-04T00:00:00Z'},
                {'complaint_id': '0', 'status': 'resolved', 'changed_at': '2026-01-05T00:00:00Z'}]
    assert completed_samples(rows, history)[0][1] == 96
    assert len(completed_samples(rows, history)) == 1


def test_history_does_not_invent_estimates():
    assert historical_estimate(CATEGORIES[0], [])['source'] == 'unavailable'
    _, records = samples()
    estimate = historical_estimate(CATEGORIES[0], records)
    assert estimate['source'] == 'history'
    assert estimate['low_days'] <= estimate['high_days']


def test_scores_abstain_when_ambiguous():
    result = rank(np.array([.5, .49, .1, .1, .1, .1, .1, .1]), 'test')
    assert result['uncertain']
    assert len(result['suggestions']) == 3


def test_endpoints_require_real_authority_session(client):
    assert client.get('/insights').status_code == 401
    assert client.post('/train').status_code == 401


def test_authority_rejects_invalid_token(client, monkeypatch):
    monkeypatch.setattr(service.httpx, 'get', lambda *args, **kwargs: service.httpx.Response(401))
    assert client.get('/insights', headers={'Authorization': 'Bearer invalid'}).status_code == 401


def test_authority_rejects_citizen_role(client, monkeypatch):
    monkeypatch.setattr(service.httpx, 'get', lambda *args, **kwargs: service.httpx.Response(200, json={'id': 'citizen'}))
    monkeypatch.setattr(service, 'rest', lambda *args, **kwargs: [{'role': 'citizen'}])
    assert client.get('/insights', headers={'Authorization': 'Bearer citizen-token'}).status_code == 403


def test_text_validates_and_returns_suggestions(client, monkeypatch):
    assert client.post('/classify/text', json={'description': 'short'}).status_code == 422
    monkeypatch.setattr(service, 'classify_text', lambda value: rank(np.array([.8, .1, .1, .1, .1, .1, .1, .1]), 'test'))
    response = client.post('/classify/text', json={'description': 'Garbage on the road outside my house'})
    assert response.status_code == 200
    assert response.json()['suggestions'][0]['category'] == CATEGORIES[0]


def test_model_unavailability_is_actionable(client, monkeypatch):
    def unavailable(value):
        raise RuntimeError('private provider credentials must not leak')
    monkeypatch.setattr(service, 'classify_text', unavailable)
    response = client.post('/classify/text', json={'description': 'A large pothole on the road'})
    assert response.status_code == 503
    assert 'credentials' not in response.text
    assert 'manually' in response.text


def test_image_bytes_validated_and_inferred(client, monkeypatch):
    assert client.post('/classify/photo', files={'file': ('fake.jpg', b'not an image', 'image/jpeg')}).status_code == 422
    buffer = io.BytesIO()
    Image.new('RGB', (24, 24)).save(buffer, format='PNG')
    monkeypatch.setattr(service, 'classify_image', lambda value: {'width': value.width})
    response = client.post('/classify/photo', files={'file': ('photo.png', buffer.getvalue(), 'image/png')})
    assert response.status_code == 200
    assert response.json()['width'] == 24


def test_oversize_body_rejected(client):
    assert client.post('/classify/photo', content=b'x' * (6 * 1024 * 1024 + 1)).status_code == 413


def test_duplicate_response_does_not_expose_private_description(client, monkeypatch):
    monkeypatch.setattr(service, 'rest', lambda *args, **kwargs: [row(1, citizen_identifier_hash='private-hash')])
    monkeypatch.setattr(service, 'embeddings', lambda texts: np.ones((len(texts), 1)))
    response = client.post('/duplicates', json={'description': 'A pile of rubbish on the road', 'lat': 23.02, 'lng': 72.57})
    assert response.status_code == 200
    match = response.json()['matches'][0]
    assert set(match) == {'code', 'category', 'status', 'distance_m', 'score'}
    assert 'private-hash' not in response.text
    assert 'description' not in response.text


def test_far_issues_not_duplicates(client, monkeypatch):
    monkeypatch.setattr(service, 'rest', lambda *args, **kwargs: [row(1, lat=25)])
    assert client.post('/duplicates', json={'description': 'A pile of rubbish on the road', 'lat': 23.02, 'lng': 72.57}).json()['matches'] == []


def test_invalid_coordinates_and_category(client):
    assert client.post('/duplicates', json={'description': 'A pile of rubbish on the road', 'lat': 100, 'lng': 72}).status_code == 422
    assert client.post('/estimate', json={'category': 'unknown'}).status_code == 422


def test_missing_server_credentials_do_not_fall_back_to_public_queries(client):
    response = client.post('/duplicates', json={'description': 'A pile of rubbish on the road', 'lat': 23.02, 'lng': 72.57})
    assert response.status_code == 503


def test_rate_limit(client):
    for _ in range(30):
        client.get('/missing')
    assert client.get('/missing').status_code == 429
    assert client.get('/health').status_code == 200


def test_training_needs_real_history(client, monkeypatch):
    service.app.dependency_overrides[service.authority] = lambda: 'test-token'
    monkeypatch.setattr(service, 'dataset', lambda token=None: ([], []))
    response = client.post('/train')
    assert response.status_code == 422
    assert 'found 0' in response.json()['detail']


def test_catboost_train_predict_and_insights(client, monkeypatch):
    pytest.importorskip('catboost')
    service.app.dependency_overrides[service.authority] = lambda: 'test-token'
    rows, records = samples()
    monkeypatch.setattr(service, 'dataset', lambda token=None: (rows + [row(100, category=CATEGORIES[0])], records))
    trained = client.post('/train')
    assert trained.status_code == 200, trained.text
    assert trained.json()['validation_count'] == 12
    assert trained.json()['sample_count'] == 60
    response = client.post('/estimate', json={'category': CATEGORIES[0], 'lat': 23.02, 'lng': 72.57})
    assert response.json()['source'] == 'catboost'
    assert response.json()['low_days'] <= response.json()['high_days']
    insights = client.get('/insights').json()
    assert insights['predictions']['100']['source'] == 'catboost'
    assert insights['completed_samples'] == 60
