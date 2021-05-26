let signInForm = document.forms.namedItem('signInForm');
signInForm.addEventListener('submit', (e) => {
  const formData = new FormData(signInForm);
  if (!formData.get('email')) {
    alert('email is required')
  } else if (!formData.get('password')) {
    alert('password is required')
  } else {
    formData.append('provider', 'native')
    e.preventDefault();
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/user/signin');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        const data = JSON.parse(xhr.responseText).data
        if (data.error) {
          alert(data.error);
        } else {
          alert('signIn completed!');
          window.localStorage.setItem('JWT', data.token)
          window.localStorage.setItem('TTTWorld_user_id', data.user.user_id)
          window.location.assign('/profile.html')
        }
      }
    };
    xhr.send(formData);
  }
});

function signup() {
  window.location = '/signup.html'
}
