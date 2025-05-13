# Speedometer 3.0: TodoMVC: React

## Description

This application uses React 17.0.2 to implement a todo application.

-   [React](https://reactjs.org/) is a JavaScript library for creating user interfaces.

The downstream version also generates the TodoMVC-React-Window workload. A variation of TodoMVC-React that renders and controls the app in a new window using the scripts loaded in the parent window.

## Implementation details

React:\
Model: todoReducer (reducer.js)\
View: React ui components\
controller: App component + useReducer hook

MVC:\
Model: maintains the data and behavior of an application\
View: displays the model in the ui\
Controller: serves as an interface between view & model components

## Built steps

To build the static files, this application utilizes webpack. It minifies and optimizes output files and copies all necessary files to a `dist` folder.

For TodoMVC-React-Window, the webpack scripts separate the JavaScript from the CSS. The JavaScript is loaded by index.html in the main window, while the css is loaded by todo.html in the child window.

## Requirements

The only requirement is an installation of Node, to be able to install dependencies and run scripts to serve a local server.

```
* Node (min version: 18.13.0)
* NPM (min version: 8.19.3)
```

## Local preview

```
terminal:
1. npm install
2. npm run start
```
