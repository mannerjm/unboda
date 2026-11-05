"""Fail-closed safeguards for next-day original lifestyle editorial JSON."""
import copy, datetime as dt, importlib.util, json, pathlib, tempfile, unittest

path=pathlib.Path(__file__).with_name("render.py")
spec=importlib.util.spec_from_file_location("unboda_lifestyle_renderer",path)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

DATE=dt.date(2026,11,4)
MOTIFS=("journal","bedroom","presentation","receipt","dialogue","family","checklist")
SLOTS=("01","04","10","13","16","19","22")
ANCHORS=(("수첩","연필"),("침대","알람시계"),("업무 자료","막대그래프"),("영수증","금액 메모"),("두 사람","말풍선"),("식탁","접시"),("체크리스트","짐 가방"))
def fixture():
 return {"schemaVersion":2,"dateKst":DATE.isoformat(),"brand":"UNBODA",
         "firstPartyOriginal":True,"notPhotographs":True,
         "stories":[{"hourKst":hour,"visualMotif":motif,"topicCategory":"career",
           "topicKey":f"original-topic-{motif}-20261104",
           "label":f"실생활의 {motif} 현장","title":f"새로운 {motif} 이야기로 내 생활을 알아볼까요",
           "advice":"실제 경험을 돌아보고 오늘 바꿀 행동 하나를 확인해 보세요.",
           "lifeSituation":f"실생활 {motif} 상황에서 잠깐 생각을 정리하는 순간",
           "visualAnchors":list(ANCHORS[i]),"sceneVariant":(i%4)+1}
           for i,(hour,motif) in enumerate(zip(SLOTS,MOTIFS))]}
class LifestyleBriefTests(unittest.TestCase):
 def load(self,data,history=None):
  with tempfile.TemporaryDirectory() as t:
   root=pathlib.Path(t)
   p=root/"next.json";p.write_text(json.dumps(data,ensure_ascii=False))
   h=root/"history";h.mkdir()
   if history is not None:
    (h/"20261103.json").write_text(json.dumps(history,ensure_ascii=False))
   return module.load_editorial(DATE,p,h)
 def test_valid_has_seven_distinct_visible_subjects(self):
  stories=self.load(fixture())
  self.assertEqual(len(stories),7)
  self.assertEqual(len(set(x["topicKey"] for x in stories)),7)
 def test_reject_stale_date(self):
  x=fixture();x["dateKst"]="2026-11-03"
  with self.assertRaisesRegex(RuntimeError,"DATE_OR_SOURCE"):self.load(x)
 def test_reject_duplicate_motif_and_title(self):
  x=fixture();x["stories"][1]["visualMotif"]="journal";x["stories"][1]["visualAnchors"]=list(ANCHORS[0])
  with self.assertRaisesRegex(RuntimeError,"DUPLICATED_DAILY"):self.load(x)
 def test_reject_same_topic_in_last_90_days(self):
  x=fixture();history=fixture()
  with self.assertRaisesRegex(RuntimeError,"RECENT_90_DAY"):self.load(x,history)
 def test_reject_missing_visible_anchor(self):
  x=fixture();x["stories"][2]["visualAnchors"]=[]
  with self.assertRaisesRegex(RuntimeError,"ANCHORS"):self.load(x)
 def test_reject_unsupported_visible_object(self):
  x=fixture();x["stories"][0]["visualAnchors"]=["지하철 전광판","운동장"]
  with self.assertRaisesRegex(RuntimeError,"VISUAL_ANCHOR_NOT_DRAWN"):
   self.load(x)
 def test_dynamic_geometry_and_real_raster_change_across_dates(self):
  from PIL import Image, ImageChops, ImageStat
  story=fixture()["stories"][0]
  date2=DATE+dt.timedelta(days=1)
  p1=module.composition_parameters(DATE,"01",story)
  p2=module.composition_parameters(date2,"01",story)
  self.assertNotEqual(p1,p2)
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp)
   for d in ("a","b"):(root/d).mkdir()
   a=module.make(DATE,"01",0,root/"a",story)
   b=module.make(date2,"01",0,root/"b",story)
   self.assertNotEqual(a["sha256"],b["sha256"])
   self.assertEqual(a["compositionParameters"],p1)
   self.assertEqual(b["compositionParameters"],p2)
   with Image.open(root/"a"/a["name"]) as first,Image.open(root/"b"/b["name"]) as second:
    self.assertEqual(first.size,(1080,1350))
    self.assertEqual(second.size,(1080,1350))
    region=(155,500,920,945)
    diff=ImageChops.difference(first.crop(region),second.crop(region))
    avg=ImageStat.Stat(diff.convert("L")).mean[0]
    self.assertGreater(avg,12.0,"Consecutive original subjects are mere recolors")
 def test_contextual_visual_details_are_rasterized_for_real_situations(self):
  from PIL import Image, ImageDraw
  cases=(
   ("journal","낯선 담당자와 통화 준비"),
   ("bedroom","새벽 창밖 소음 점검"),
   ("presentation","보고서에 자료 출처 표시"),
   ("receipt","예상보다 세탁 비용 확인"),
   ("dialogue","친구에게 빌린 책 돌려주기"),
   ("family","가족사진을 함께 고르는 시간"),
   ("checklist","이사 후 주소 변경 확인"),
   ("checklist","택배 반품 전 확인"),
  )
  for motif,title in cases:
   with self.subTest(motif=motif,title=title):
    image=Image.new("RGBA",(1080,1350),(0,0,0,0))
    module.contextual_visual_detail(ImageDraw.Draw(image),
      {"visualMotif":motif,"title":title,"lifeSituation":title})
    bounds=image.getbbox()
    self.assertIsNotNone(bounds,"Story-specific illustration details missing")
    self.assertGreater(bounds[2]-bounds[0],45)
    self.assertGreater(bounds[3]-bounds[1],45)
    self.assertGreaterEqual(bounds[0],155)
    self.assertGreaterEqual(bounds[1],500)
    self.assertLessEqual(bounds[2],920)
    self.assertLessEqual(bounds[3],945)
 def test_procedural_cards_are_never_mislabeled_as_real_lifestyle_photos(self):
  # These legacy images remain for QA, not the photo required for SNS.
  from PIL import Image
  s=fixture()["stories"][0]
  with tempfile.TemporaryDirectory() as tmp:
   result=module.make(DATE,"01",0,pathlib.Path(tmp),s)
   self.assertEqual(result["imageRole"],"procedural-illustration-qa")
   self.assertIs(result["socialPhotoApproved"],False)
   self.assertIs(result["notARealPhotograph"],True)
   self.assertEqual(Image.open(pathlib.Path(tmp)/result["name"]).size,(1080,1350))
 def test_no_fixed_story_fallback(self):
  with self.assertRaisesRegex(RuntimeError,"DAILY_NEW_EDITORIAL"):
   module.load_editorial(DATE,None)
if __name__=="__main__":unittest.main()
