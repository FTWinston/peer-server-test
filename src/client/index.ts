import { LocalConnection } from "./LocalConnection";

function createElement() {
    const element = document.createElement('div');
  
    element.innerHTML = 'Hello webpack';
  
    return element;
}
  
document.body.appendChild(createElement());



const connection = new LocalConnection(data => {
    console.log('message received from worker', data)
});

connection.sendMessage('hullo');