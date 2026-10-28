import json,pathlib,sys,unittest,copy,hashlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from render import verify,draw_frame,BRAND_PALETTES
BASE=pathlib.Path(__file__).resolve().parent/"episodes"
FILES=["003-midnight.json","004-commute.json","005-friendship.json","002-afterwork.json"]
class TestSajuBrandVisuals(unittest.TestCase):
 def setUp(self):
  self.films=[verify(json.loads((BASE/f).read_text())) for f in FILES]
 def test_four_different_pictures_not_same_template_with_changed_text(self):
  crops=[]
  for e in self.films:
   im=draw_frame(e,0,0.7)
   self.assertEqual(im.size,(720,1280))
   # Crop the illustrated region, not the unique Korean title text.
   crops.append(hashlib.sha256(im.crop((110,510,610,923)).tobytes()).hexdigest())
  self.assertEqual(len(set(crops)),4,"Four videos have identical background/hero art")
 def test_four_palettes_and_same_scene_motion_differ(self):
  self.assertEqual(len({b["visualStyle"] for b in self.films}),4)
  self.assertEqual(len(BRAND_PALETTES),4)
  for b in self.films:
   frame1=draw_frame(b,0,.1)
   frame2=draw_frame(b,0,2.2)
   h1=hashlib.sha256(frame1.tobytes()).hexdigest()
   h2=hashlib.sha256(frame2.tobytes()).hexdigest()
   self.assertNotEqual(h1,h2,"Scene must have genuine motion")
 def test_no_saju_explanation_or_unboda_cta_is_rejected(self):
  x=copy.deepcopy(self.films[0])
  x["narrationDraft"][1]="지금은 휴대폰을 내려놓아 보는 것도 좋아요."
  with self.assertRaisesRegex(ValueError,"VIDEO_SAJU_EXPLANATION_REQUIRED"):verify(x)
  x=copy.deepcopy(self.films[0])
  x["narrationDraft"][3]="이제 그냥 쉬는 하루로 마무리하세요."
  with self.assertRaisesRegex(ValueError,"VIDEO_UNBODA_FREE_SAJU_CTA_REQUIRED"):verify(x)
if __name__=="__main__":unittest.main()
