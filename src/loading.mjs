const query = new URLSearchParams(location.search)
const status = query.get('status')
const message = query.get('message')

if (status === 'error') {
  document.documentElement.classList.add('error')
  document.querySelector('#status').textContent = message || 'The local agent runtime stopped unexpectedly.'
}
