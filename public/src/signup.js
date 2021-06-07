const socket = io()
let signUpForm = document.forms.namedItem('signUpForm');
signUpForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(signUpForm);
  console.log(formData.get('name'))
  let xhr = new XMLHttpRequest();
  xhr.open('POST', '/user/signup');
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      const data = JSON.parse(xhr.responseText)
      console.log(data)
      if (data.data.error) {
        alert(data.data.error);
      } else {
        alert('signIn completed!');
        console.log(data.data)
        window.localStorage.setItem('JWT', data.data.token)
        window.location.assign('/profile.html')
      }
    }
  };
  xhr.send(formData);
});

function addInterest() {
  //get user input
  const userInput = document.querySelector('#userInput')
  const customInterest = userInput.value

  //get template & clone content
  const template = document.querySelector('#newInterest').content
  const clone = document.importNode(template, true)

  const label = clone.querySelector('label')
  const input = clone.querySelector('input')

  //put the innerHTML (include the input element) into label
  input.setAttribute('value', customInterest)
  label.innerHTML += customInterest

  const interestList = document.querySelector('#interest-list')
  const insertPoint = document.querySelector('#insert-point')
  interestList.insertBefore(clone, insertPoint)
}

function signin() {
  window.location = '/signin.html'
}

let deviceLocation
function getPosition(element) {
  if (element.checked === true) {
    if (!deviceLocation) {
      async function success(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
          method: "GET"
        }).then(res => res.json())
          .then(res => {
            deviceLocation = res.display_name
            document.querySelector('input[name=address]').value = deviceLocation
          })
      }

      function error() {
        status.textContent = 'Unable to retrieve your location';
      }

      if (!navigator.geolocation) {
        status.textContent = 'Geolocation is not supported by your browser';
      } else {
        status.textContent = 'Locating…';
        navigator.geolocation.getCurrentPosition(success, error);
      }
    } else {
      document.querySelector('input[name=address]').value = deviceLocation
    }

  } else {
    document.querySelector('input[name=address]').value = ''
  }
}
