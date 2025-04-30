//Antworten Empfangen

let data = {}

window.addEventListener("message", (event) => {
  if (!Array.isArray(event.data.data)) {
    data = { ...data, ...event.data.data }
    document.querySelector("#result").innerHTML = JSON.stringify(data, null, 2)
  }
})

document.querySelector("#test").addEventListener("click", () => {
  window.parent.postMessage({ type: "getData" }, "*")
})

