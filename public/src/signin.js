const signInForm = document.forms.namedItem('signInForm')
signInForm.addEventListener('submit', (e) => {
  const formData = new FormData(signInForm)
  formData.append('provider', 'native')
  e.preventDefault()
  const xhr = new XMLHttpRequest()
  xhr.open('POST', '/user/signin')
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      const data = JSON.parse(xhr.responseText)
      if (!data.data) {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: `${data.error}`
        })
      } else {
        const socket = io({
          auth: {
            user_id: data.data.user.user_id
          }
        })
        socket.emit('signin', data.data.user)
        window.localStorage.setItem('JWT', data.data.token)
        Swal.fire(
          'Wlecome back!',
          'Your friend are waiting for you',
          'success'
        ).then((result) => {
          if (result.isConfirmed) {
            window.location.assign('/profile.html')
          }
        })
      }
    }
  }
  xhr.send(formData)
})

function signup() {
  window.location = '/signup.html'
}
