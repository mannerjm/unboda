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
 def test_short_saju_first_hook_moves_toward_scene_center_without_voice_overlap(self):
  # Actual 11/20 midnight clip had 4.68s of silence from the fixed 0.25s
  # opening. Center a 3.8s hook and a 6.1s explanation; do not lower QA.
  offset=narrate.scene_voice_offset(3.8)
  self.assertAlmostEqual(offset,1.85)
  other=narrate.scene_voice_offset(6.09)
  self.assertAlmostEqual(other,0.705)
  # Same estimated voiced timings and internal silence envelopes as the
  # blocked render: first audible end + new second audible start <4s.
  first_voice_end=3.18+offset
  next_voice_start=7.5+other+0.36
  self.assertLess(next_voice_start-first_voice_end,4.0)
  for sec in (3.8,5.0,6.09,6.9):
   start=narrate.scene_voice_offset(sec)
   self.assertGreaterEqual(start,narrate.START_OFFSET)
   self.assertLessEqual(start+sec,narrate.SCENE_SECONDS-0.3+1e-6)
  with self.assertRaisesRegex(RuntimeError,"KOREAN_VOICE_ALIGNMENT_FAILED"):
   narrate.scene_voice_offset(8.4)
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
