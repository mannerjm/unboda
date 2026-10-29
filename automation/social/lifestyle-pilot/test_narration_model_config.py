"""Offline regression guard: no repeated HuggingFace model loads in 4 renders."""
import ast, pathlib, unittest
CODE=pathlib.Path(__file__).with_name("narrate.py")
class ModelSourceTests(unittest.TestCase):
    def test_syntax_and_offline_model_handoff(self):
        src=CODE.read_text(encoding="utf8")
        ast.parse(src)
        self.assertIn("UNBODA_TTS_CONFIG_PATH",src)
        self.assertIn("UNBODA_TTS_CHECKPOINT_PATH",src)
        self.assertIn("PINNED_KOREAN_VOICE_MODEL_FILES_INVALID",src)
        self.assertIn("ckpt_path=str(checkpoint)",src)
        self.assertIn("config_path=str(config)",src)
        self.assertIn('use_hf=False',src)
        self.assertNotIn('TTS(language="KR",device="cpu")',src)
    def test_no_unapproved_tts_fallback(self):
        src=CODE.read_text(encoding="utf8")
        self.assertNotIn("edge_tts",src)
        self.assertNotIn("gTTS",src)
        self.assertIn("FOUR_KOREAN_SCRIPTS_REQUIRED",src)
        self.assertIn("VOICE_OVER_RUNS_NEXT_VISUAL_SCENE",src)
if __name__=="__main__":unittest.main()
