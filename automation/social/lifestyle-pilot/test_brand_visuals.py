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
 def test_finance_motion_survives_phone_preview_scale(self):
  from PIL import ImageChops,ImageStat,Image
  b=self.films[3]
  for a,c in ((.2,.6),(2.4,2.8),(5.0,5.4)):
   frame1=draw_frame(b,0,a).crop((132,546,583,910)).resize((180,150),Image.Resampling.BICUBIC)
   frame2=draw_frame(b,0,c).crop((132,546,583,910)).resize((180,150),Image.Resampling.BICUBIC)
   mean=sum(ImageStat.Stat(ImageChops.difference(frame1,frame2)).mean)/3.0
   self.assertGreater(mean,2.0,"Budget-paper and ledger must visibly animate even on mobile")
 def test_topic_motif_is_actually_drawn_and_changes_subject_not_just_color(self):
  for b in self.films:
   self.assertIn("visualMotif",b)
   self.assertGreater(len(b["visualMotif"]),8)
  original=draw_frame(self.films[3],0,0.7).crop((198,594,522,867)).tobytes()
  other=copy.deepcopy(self.films[3])
  other["visualMotif"]="expense-ledger"
  generic=draw_frame(other,0,0.7).crop((198,594,522,867)).tobytes()
  self.assertNotEqual(hashlib.sha256(original).hexdigest(),hashlib.sha256(generic).hexdigest(),
   "Same colored panel cannot disguise an unrelated topic graphic")
  with self.assertRaisesRegex(ValueError,"VIDEO_SITUATION_AND_VISIBLE_MOTIF_MISMATCH"):
   verify(other)
 def test_missing_or_unrenderable_motif_cannot_pass(self):
  wrong=copy.deepcopy(self.films[1])
  wrong["visualMotif"]="subscription-billing"
  with self.assertRaisesRegex(ValueError,"UNSUPPORTED_OR_WRONG_TOPIC_VISUAL_MOTIF"):
   verify(wrong)
  wrong=copy.deepcopy(self.films[1])
  del wrong["visualMotif"]
  with self.assertRaisesRegex(ValueError,"UNSUPPORTED_OR_WRONG_TOPIC_VISUAL_MOTIF"):
   verify(wrong)
 def test_no_saju_explanation_or_unboda_cta_is_rejected(self):
  x=copy.deepcopy(self.films[0])
  x["narrationDraft"][1]="지금은 휴대폰을 내려놓아 보는 것도 좋아요."
  with self.assertRaisesRegex(ValueError,"VIDEO_SAJU_EXPLANATION_REQUIRED"):verify(x)
  x=copy.deepcopy(self.films[0])
  x["narrationDraft"][3]="이제 그냥 쉬는 하루로 마무리하세요."
  with self.assertRaisesRegex(ValueError,"VIDEO_UNBODA_FREE_SAJU_CTA_REQUIRED"):verify(x)
if __name__=="__main__":unittest.main()
