let signUpForm = document.forms.namedItem('signUpForm');
signUpForm.addEventListener('submit', (e) => {
  const formData = new FormData(signUpForm);
  e.preventDefault();
  let xhr = new XMLHttpRequest();
  xhr.open('POST', '/user/signUp');
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      alert('signup completed!');
      const data = JSON.parse(xhr.responseText)
      window.localStorage.setItem('JWT', data.data.token)
      window.location.assign('/profile')
    }
  };
  xhr.send(formData);
});