"""Unit tests for natural-speed 7.5-second Korean voice scene alignment."""
import pathlib,sys,tempfile,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import narrate
class NarrationTimingTests(unittest.TestCase):
 def test_voice_starts_and_ends_within_four_scenes(self):
  self.assertEqual(narrate.SCENE_STARTS,[0,7.5,15,22.5])
  self.assertGreaterEqual(narrate.START_OFFSET,.2)
  self.assertLessEqual(narrate.START_OFFSET+narrate.LIMIT,7.5-.3)
 def test_7_point_38_seconds_can_be_shortened_by_at_most_12_percent(self):
  with tempfile.TemporaryDirectory() as folder:
   p=pathlib.Path(folder)/'voice.wav';p.write_bytes(b'voice')
   speeds=[]
   def fake_ffmpeg(*args,**kwargs):
    arglist=list(args)
    if '-af' in arglist:
     speed=float(arglist[arglist.index('-af')+1].split('=')[1])
     speeds.append(speed)
     pathlib.Path(arglist[-1]).write_bytes(b'short')
   with patch.object(narrate,'duration',side_effect=[7.38,6.8]),patch.object(narrate,'run',fake_ffmpeg):
    result=narrate.validate_audio(p,narrate.LIMIT)
   self.assertEqual(result,6.8)
   self.assertEqual(len(speeds),1)
   self.assertLessEqual(speeds[0],1.12)
 def test_overlong_8_point_4_second_scene_fails_no_crop(self):
  with tempfile.TemporaryDirectory() as folder:
   p=pathlib.Path(folder)/'voice.wav';p.write_bytes(b'voice')
   with patch.object(narrate,'duration',return_value=8.4),patch.object(narrate,'run') as run:
    with self.assertRaisesRegex(RuntimeError,'NARRATION_TOO_LONG_FOR_SCENE'):
     narrate.validate_audio(p,narrate.LIMIT)
    run.assert_not_called()
 def test_invalid_underlength_voice_is_rejected(self):
  with tempfile.TemporaryDirectory() as folder:
   p=pathlib.Path(folder)/'voice.wav';p.write_bytes(b'voice')
   with patch.object(narrate,'duration',return_value=1.0):
    with self.assertRaisesRegex(RuntimeError,'KOREAN_NARRATION_SEGMENT_TOO_SHORT'):
     narrate.validate_audio(p,narrate.LIMIT)
if __name__=='__main__':unittest.main()
