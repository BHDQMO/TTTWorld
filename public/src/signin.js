let signInForm = document.forms.namedItem('signInForm');
signInForm.addEventListener('submit', (e) => {
  const formData = new FormData(signInForm);
  formData.append('provider', 'native')
  e.preventDefault();
  let xhr = new XMLHttpRequest();
  xhr.open('POST', '/user/signIn');
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      alert('signIn completed!');
      const data = JSON.parse(xhr.responseText)
      window.localStorage.setItem('JWT', data.data.token)
      window.location.assign('/profile.html')
    }
  };
  xhr.send(formData);
});