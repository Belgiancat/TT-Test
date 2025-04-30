//Antworten Empfangen

window.addEventListener("message", (event) => {
  document.querySelector("#result").innerHTML = JSON.stringify(event.data, null, 2)
})

document.querySelector("#test").addEventListener("click", () => {
  window.parent.postMessage({ type: "getData" })
})