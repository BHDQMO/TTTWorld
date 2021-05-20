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