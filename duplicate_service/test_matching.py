from datetime import datetime,timedelta,timezone
import pytest
from fastapi.testclient import TestClient
from app import app

@pytest.fixture
def client(): return TestClient(app)
def row():
 return dict(id='existing-report',description='There are deep potholes on the main road near the school',category='Road Damage/Potholes',status='submitted',lat=23,lng=72,created_at=datetime.now(timezone.utc).isoformat())
def check(client,text,candidates=None):
 return client.post('/match',json={'description':text,'lat':23,'lng':72,'candidates':candidates if candidates is not None else [row()]})
@pytest.mark.parametrize('description',[
 'The road near the school has large holes and needs repairing',
 'स्कूल के पास सड़क पर गहरे गड्ढे हैं',
 'பள்ளி அருகே சாலையில் ஆழமான பள்ளங்கள் உள்ளன',
 'పాఠశాల దగ్గర రోడ్డుపై లోతైన గుంతలు ఉన్నాయి',
 'શાળા પાસે રસ્તા પર ઊંડા ખાડા છે',
])
def test_multilingual_paraphrases(client,description):
 response=check(client,description)
 assert response.status_code==200,response.text
 assert response.json()['matches'] and response.json()['matches'][0]['id']=='existing-report',response.text
@pytest.mark.parametrize('description',[
 'There is a traffic jam near the school every morning',
 'A water pipe has burst near the school',
 'The school building needs paint',
 'The street light near the park is not working',
 'Garbage is piled up by the park and has not been collected',
 'Buy cheap shoes now special offer click this link',
 'Subscribe to my channel win a prize and earn free money',
 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 'hello good morning how are you',
 'The road is in good condition with no potholes',
])
def test_unrelated_and_spam_do_not_match(client,description):
 response=check(client,description)
 assert response.status_code==200,response.text
 assert response.json()['matches']==[],response.text
@pytest.mark.parametrize('changes',[
 {'lat':24}, {'created_at':(datetime.now(timezone.utc)-timedelta(days=31)).isoformat()},
 {'created_at':(datetime.now(timezone.utc)+timedelta(days=1)).isoformat()},
 {'status':'resolved'}, {'status':'rejected'},
])
def test_distance_age_closed_defenses(client,changes):
 candidate=row();candidate.update(changes)
 assert check(client,candidate['description'],[candidate]).json()['matches']==[]
def test_no_candidates_does_not_invent_matches(client):
 assert check(client,'There are deep potholes on the main road near the school',[]).json()['matches']==[]
def test_invalid_coordinates(client):
 assert client.post('/match',json={'description':'A broken road','lat':91,'lng':72,'candidates':[]}).status_code==422
