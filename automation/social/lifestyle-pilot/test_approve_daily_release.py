"""Offline, zero-publishing safety tests for the automated daily release gate."""
import ast, pathlib, runpy, unittest
P=pathlib.Path(__file__).with_name("approve-daily-release.py")
class TestApprovedDailyRelease(unittest.TestCase):
 def test_valid_python_and_documented_closed_gate(self):
  source=P.read_text()
  ast.parse(source)
  self.assertIn("DAILY_KOREAN_NARRATION_NOT_CLEAR_ENOUGH",source)
  self.assertIn('v["voiceHumanReviewed"]=False',source)
  self.assertIn('v["voiceAutomatedQaApproved"]=True',source)
  self.assertIn('if ratio<.82:',source)
 def test_editorial_history_rejects_reused_prior_topics_and_openings(self):
  g=runpy.run_path(str(P))
  prior={"dateKst":"20261029","topicKey":"saju-old-20261029",
         "opening":"친구와 약속 장소가 자꾸 엇갈리는 저녁"}
  new={"topicKey":"saju-old-20261029",
       "narrationDraft":["다른 새로운 도입이에요"]}
  with self.assertRaisesRegex(ValueError,"REPEATED_PRIOR_SAJU_TOPIC_KEY"):
   g["ensure_history_not_reused"](new,"20261030",[prior])
  new={"topicKey":"saju-new-20261030",
       "narrationDraft":["친구와 약속 장소가 자꾸 엇갈리는 저녁"]}
  with self.assertRaisesRegex(ValueError,"REPEATED_PRIOR_SAJU_OPENING"):
   g["ensure_history_not_reused"](new,"20261030",[prior])
 def test_current_date_entries_are_allowed_only_as_current(self):
  g=runpy.run_path(str(P))
  prior={"dateKst":"20261030","topicKey":"saju-new-20261030",
         "opening":"같은 날의 저장된 생성 이력"}
  new={"topicKey":"saju-new-20261030",
       "narrationDraft":["같은 날의 저장된 생성 이력"]}
  g["ensure_history_not_reused"](new,"20261030",[prior])
if __name__=="__main__":unittest.main()
