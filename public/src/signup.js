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
      if (data.data.error) {
        alert(data.data.error);
      } else {
        alert('signIn completed!');
        console.log(data.data)
        window.localStorage.setItem('JWT', data.data.token)
        window.localStorage.setItem('TTTWorld_user_id', data.data.user.user_id)
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

