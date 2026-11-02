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
  x=fixture();x["stories"][1]["visualMotif"]="journal"
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
 def test_no_fixed_story_fallback(self):
  with self.assertRaisesRegex(RuntimeError,"DAILY_NEW_EDITORIAL"):
   module.load_editorial(DATE,None)
if __name__=="__main__":unittest.main()
