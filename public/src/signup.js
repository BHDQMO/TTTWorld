const socket = io()
const MAX_SIZE = 10
document.querySelector('label[for=formFile]').textContent += ` (Max size: ${MAX_SIZE}MB)`
const headShot = document.querySelector('#formFile')
headShot.addEventListener('change', (e) => {
  const fileSize = e.currentTarget.files[0].size / 1024 / 1024
  if (fileSize > MAX_SIZE) {
    Swal.fire(
      `The file is over ${MAX_SIZE}MB(${Math.ceil(fileSize * 10) / 10}MB)`,
      'Please choose another one',
      'info'
    )
    e.currentTarget.value = null
  }
})

const signUpForm = document.forms.namedItem('signUpForm')
signUpForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const formData = new FormData(signUpForm)
  const xhr = new XMLHttpRequest()
  xhr.open('POST', '/user/signup')
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      const data = JSON.parse(xhr.responseText)
      if (!data.data) {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: `${data.error}`
        })
      } else {
        window.localStorage.setItem('JWT', data.data.token)
        Swal.fire(
          'Wlecome to join us!',
          "Let' go to find some learning partners",
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

function addInterest() {
  // get user input
  const userInput = document.querySelector('#userInput')
  const customInterest = userInput.value

  // get template & clone content
  const template = document.querySelector('#newInterest').content
  const clone = document.importNode(template, true)

  const label = clone.querySelector('label')
  const input = clone.querySelector('input')

  // put the innerHTML (include the input element) into label
  input.setAttribute('value', customInterest)
  label.innerHTML += customInterest

  const interestList = document.querySelector('#interest-list')
  const insertPoint = document.querySelector('#insert-point')
  interestList.insertBefore(clone, insertPoint)
  userInput.value = ''
}

function signin() {
  window.location = '/signin.html'
}

let deviceLocation
function getPosition(element) {
  const inputbox = document.querySelector('input[name=address]')
  inputbox.value = 'Getting location from your device ...'
  inputbox.style = 'color: gray'
  if (element.checked === true) {
    if (!deviceLocation) {
      async function success(position) {
        const { latitude } = position.coords
        const { longitude } = position.coords

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
          method: 'GET'
        }).then((res) => res.json())
          .then((res) => {
            deviceLocation = res.display_name
            inputbox.style = 'color: #212529;'
            inputbox.value = deviceLocation
          })
      }

      function error() {
        status.textContent = 'Unable to retrieve your location'
      }

      if (!navigator.geolocation) {
        status.textContent = 'Geolocation is not supported by your browser'
      } else {
        status.textContent = 'Locating…'
        navigator.geolocation.getCurrentPosition(success, error)
      }
    } else {
      document.querySelector('input[name=address]').value = deviceLocation
    }
  } else {
    document.querySelector('input[name=address]').value = ''
  }
}
