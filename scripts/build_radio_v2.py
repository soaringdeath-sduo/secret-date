"""Generate two naturally spoken military-radio dispatches with soft interference."""
import asyncio
import pathlib
import subprocess
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
ASSETS.mkdir(exist_ok=True)
WORK = pathlib.Path('/tmp/radio-v2')
WORK.mkdir(exist_ok=True)
SR = 24000
BASE = (
    'Внимание, приём. Секретный канал установлен. '
    'Объект Л ноль один, вы на связи? '
    'Начальная точка — {origin}. Маршрут засекречен. '
    'Пассажир на месте. Водитель ведёт себя подозрительно спокойно. '
    'По нашим данным, организатор что-то скрывает. '
    'Вопрос протокола: вы доверяете своему водителю? '
    'Ответьте на экране. Конец связи.'
)

def process_radio(voice, sr, seed):
    rng = np.random.default_rng(seed)
    voice = np.asarray(voice, dtype=np.float64)
    if voice.ndim > 1:
        voice = voice.mean(axis=1)
    voice = sosfilt(butter(3, 150, btype='highpass', fs=sr, output='sos'), voice)
    voice = sosfilt(butter(3, 4100, btype='lowpass', fs=sr, output='sos'), voice)
    level = np.quantile(np.abs(voice), .98)
    if level > .0001:
        voice *= .49 / level
    voice = np.tanh(voice * 1.06) / np.tanh(1.06)
    voice = np.clip(voice, -.68, .68)

    def noise(n, amp):
        x = rng.normal(0, 1, n)
        x = sosfilt(butter(2, 3500, btype='lowpass', fs=sr, output='sos'), x)
        return x * (amp / max(np.std(x), .001))

    n0, n1, gap = int(sr*.39), int(sr*.40), int(sr*.08)
    lead = noise(n0, .014)
    lead *= np.sin(np.linspace(0, np.pi, n0))**.5
    pip_n = int(sr*.08)
    pip = .065*np.sin(2*np.pi*740*np.arange(pip_n)/sr)
    pip *= np.sin(np.linspace(0,np.pi,pip_n))**1.3
    lead[int(sr*.15):int(sr*.15)+pip_n] += pip
    voice += noise(len(voice), .0038)
    end = noise(n1, .012)*np.cos(np.linspace(0,np.pi/2,n1))**.8
    out = np.concatenate([lead,np.zeros(gap),voice,np.zeros(gap),end,np.zeros(int(sr*.17))])
    out = np.clip(out,-.85,.85)
    ramp = int(sr*.02)
    out[:ramp] *= np.linspace(0,1,ramp)
    out[-ramp:] *= np.linspace(1,0,ramp)
    return out.astype(np.float32)

async def generate(city, origin, seed):
    text = BASE.format(origin=origin)
    mp3 = WORK / f'{city}-natural.mp3'
    for attempt in range(3):
        try:
            await edge_tts.Communicate(
                text=text, voice='ru-RU-DmitryNeural', rate='-8%', pitch='-6Hz'
            ).save(str(mp3))
            if mp3.stat().st_size < 4000:
                raise ValueError('Voice audio empty')
            break
        except Exception as exc:
            print(f'Voice attempt {attempt+1} for {city}: {exc}', flush=True)
            if attempt == 2:
                raise
            await asyncio.sleep(7)
    decoded = WORK / f'{city}-clean.wav'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',
                    '-i',str(mp3),'-ac','1','-ar',str(SR),str(decoded)],check=True)
    voice, rate = sf.read(decoded)
    mixed = process_radio(voice, rate, seed)
    wav = WORK / f'{city}-radio.wav'
    sf.write(wav,mixed,SR,subtype='PCM_16')
    dst = ASSETS / f'radio-{city}-v2.mp3'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',
                    '-i',str(wav),'-ac','1','-ar',str(SR),
                    '-codec:a','libmp3lame','-b:a','96k',str(dst)],check=True)
    print(f'Created {dst}: {dst.stat().st_size} bytes, {len(mixed)/SR:.1f}s',flush=True)

async def main():
    await generate('zap','Заплюсье',2810)
    await generate('luga','Луга',2811)

if __name__=='__main__':
    asyncio.run(main())
