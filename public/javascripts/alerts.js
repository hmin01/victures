// const alerts = document.querySelectorAll('.fa-times-circle');
// const alertsFade = document.querySelectorAll('.alert-fade');
// // Options
// const options = { attributes: true }

// console.log(alertsFade)

// let count = 0

// function getAlert(el) {
//   if (el.classList.contains('alert')) return el
//   else return getAlert(el.parentNode)
// }

// function checkShowing(el) {
//   if (el.classList.contains('alert_none')) return false
//   else return true
// }

// alerts.forEach(el => el.addEventListener('click', () => {
//   const father = getAlert(el)
//   father.classList.toggle('alert_none')
// }))

// const onClassChange = new Event(`classChange`)

// function createNewObserver() {
//     const observer = new MutationObserver(mutationList => {
//         const alert = mutationList[0].target
//         observer.disconnect()
//         if (!alert.classList.contains('alert_none'))
//         alert.dispatchEvent(onClassChange)
//     });
//     return observer
// }

// alertsFade.forEach(el => {
//     const mutation = createNewObserver()
//     mutation.observe(el, options)
// });

// alertsFade.forEach(el => el.addEventListener('classChange', ev => {
//     const alert = ev.target
//     if (!alert.classList.contains('alert_none')) {
//         const time = parseInt(alert.getAttribute('data-fade-time')) * 1000
//         setTimeout(() => {
//         alert.classList.toggle('alert_none')
//         const mutation = createNewObserver()
//         mutation.observe(alert, options)
//         }, time)
//     }
// }));

// Show
function customAlert(type="default", message="", duration=3000) {
    // Alert content
    const content =     `<div class="alert--icon"><i class="fas fa-check-circle"></i></div>
                        <div class="alert--content">${message}</div>
                        <div class="alert--close"><i class="far fa-times-circle"></i></div>`;
    // Create alert
    const div = document.createElement('div');
    div.className = `alert alert_sm alert_${type} alert-fade`;
    div.style.animationDelay = '0.15s';
    div.innerHTML = content;
    // Add eventListener
    div.querySelector('.fa-times-circle').addEventListener('click', function() {
        closeAlert(div);
    });
    // Set timeout (auto close / default 3s)
    setTimeout(function() {
        closeAlert(div);
    }, duration);
    // Add alert
    document.querySelector('#form-alert').appendChild(div);
}

function closeAlert(elem) {
    if (!elem.classList.contains('alert-hide')) {
        elem.classList.add('alert-hide');
        setTimeout(function() {
            elem.remove();
        }, 700);
    }
}