export function getDuration(dur: number) {
  dur = Math.round(dur)
  let secs = dur % 60
  let secsText = String(secs)
  if (secs < 10) secsText = '0' + secs
  const mins = (dur - secs) / 60
  return mins + ':' + secsText
}
