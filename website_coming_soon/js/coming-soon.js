document.getElementById('year').textContent = new Date().getFullYear();
const params = new URLSearchParams(window.location.search);
if (params.has('view') || params.has('room')) {
  window.location.replace('/app/' + window.location.search + window.location.hash);
}
