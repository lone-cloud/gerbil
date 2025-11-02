export const KLITE_CSS_OVERRIDE = `
<style id="gerbil-css-override">
* {
  transition: 100ms ease all;
}

.maincontainer {
  padding-right: 0 !important;
  padding-left: 0 !important;
}

.adaptivecontainer {
  width: 100% !important;
}

#lastreq1 {
  margin: 0 10px;
}

#inputrow {
  padding: 0 10px;
}

#navbarNavDropdown {
  padding: 0;
}

#actionmenuitems {
  margin-left: 10px;
}

#inputrow > :nth-child(1) {
  padding-right: 0 !important;
}
#inputrow.show_mode > :nth-child(1) {
  flex: 0 0 70px;
  margin-right: 4px;
}
#inputrow > :nth-child(3) {
  flex: 0 0 70px;
  padding-right: 0 !important;
}
#inputrow.show_mode > :nth-child(3) button {
  background-color: #129c00;
  font-size: 14px;
}
#inputrow.show_mode > :nth-child(3) button:hover {
  background-color: #058105;
}
</style>`;
