import React from "react";
import { render } from "react-dom";
import { HashRouter, Route, Routes } from "react-router-dom";

import { App } from "./todo/app";
import "todomvc-app-css/index.css";

let childWindow = window.open("todo.html", "_blank", "width=800,height=600");

let AsyncLoop = () => {
    if (childWindow.document.getElementById("root")) {
        render(
            <HashRouter>
                <Routes>
                    <Route path="*" element={<App />} />
                </Routes>
            </HashRouter>,
            childWindow.document.getElementById("root")
        );
        globalThis.childWindow = childWindow;
    } else {
        setTimeout(AsyncLoop, 10);
    }
};

AsyncLoop();
