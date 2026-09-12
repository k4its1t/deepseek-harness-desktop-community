const query = new URLSearchParams(location.search)
const status = query.get('status')
const message = query.get('message')
if (message) document.querySelector('#status').textContent = message

if (status === 'error') {
  document.documentElement.classList.add('error')
  document.querySelector('#status').textContent = message || 'The local agent runtime stopped unexpectedly.'
  document.querySelector('#recovery').hidden = false
}

document.querySelector('#retry').onclick = async (event) => {
  event.target.disabled = true
  try { await window.desktopRecovery.retry() } finally { event.target.disabled = false }
}
document.querySelector('#logs').onclick = () => window.desktopRecovery.openLogs()
