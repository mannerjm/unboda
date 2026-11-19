import json,pathlib,sys,unittest,copy
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from render import verify,draw_frame
BRIEF=pathlib.Path(__file__).resolve().parent/"episodes"/"002-afterwork.json"

class TestKoreanLifestyleRendering(unittest.TestCase):
 def setUp(self):self.brief=json.loads(BRIEF.read_text())
 def test_approved_shape_remains_private(self):
  x=verify(self.brief)
  self.assertFalse(x["automatedPublicationAllowed"])
  self.assertEqual(len(x["scenes"]),4)
  img=draw_frame(x,0,0)
  self.assertEqual(img.size,(720,1280))
 def test_missing_scene_and_unsafe_public_flag_are_blocked(self):
  x=copy.deepcopy(self.brief);x["scenes"]=x["scenes"][:3]
  with self.assertRaisesRegex(ValueError,"FOUR_SCENES_REQUIRED"):verify(x)
  x=copy.deepcopy(self.brief);x["automatedPublicationAllowed"]=True
  with self.assertRaisesRegex(ValueError,"UNRELEASED_BRIEF_REQUIRED"):verify(x)
 def test_long_korean_title_is_rejected_not_overprinted(self):
  x=copy.deepcopy(self.brief);x["scenes"][0]["headline"][0]="글자가 너무 길어서 아래의 콘텐츠와 겹칠 수 있는 문장입니다"
  with self.assertRaisesRegex(ValueError,"HEADLINE_SAFE_WIDTH_OVERFLOW"):verify(x)
 def test_first_voice_must_start_with_real_daily_situation(self):
  # This rule applies to LEGACY life-first scripts, not the newly approved
  # four saju-first marketing formats. Generated briefs now carry that format.
  x=copy.deepcopy(self.brief);x["editorialFormat"]=None
  x["narrationDraft"][0]="사주에서 이런 일이 일어날 확률이 높습니다."
  with self.assertRaisesRegex(ValueError,"REAL_LIFE_OPENING_REQUIRED"):verify(x)

 def test_four_saju_first_formats_keep_direct_entry_and_visible_saju(self):
  for mode in ("curiosity","empathy","service_demo","difference"):
   with self.subTest(mode=mode):
    x=copy.deepcopy(self.brief)
    x["editorialFormat"]=mode
    x["destination"]="https://unboda.kr/guest-saju"
    x["narrationDraft"][0]="태어난 시간을 몰라도 사주를 볼 수 있을까요?"
    h=x["scenes"][0]["headline"]
    if "사주" not in h[0]:h[0]+=" 사주"
    self.assertEqual(verify(x)["editorialFormat"],mode)
    not_saju=copy.deepcopy(x)
    not_saju["narrationDraft"][0]="오늘은 어떤 정보를 살펴볼 수 있을까요?"
    with self.assertRaisesRegex(ValueError,"SAJU_FIRST_QUESTION_REQUIRED"):verify(not_saju)
    hidden=copy.deepcopy(x)
    hidden["scenes"][0]["headline"][0]=hidden["scenes"][0]["headline"][0].replace("사주","")
    with self.assertRaisesRegex(ValueError,"FIRST_COVER_MUST_SHOW_SAJU"):verify(hidden)
    wrong_url=copy.deepcopy(x);wrong_url["destination"]="https://unboda.kr"
    with self.assertRaisesRegex(ValueError,"SAJU_FIRST_NEEDS_DIRECT_FREE_ANALYSIS_DESTINATION"):verify(wrong_url)


if __name__=="__main__":unittest.main()
