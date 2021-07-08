import { Box } from "@material-ui/core";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/core/styles";
import React from "react";
import { BrowserRouter as Router,  Switch, Route, Link } from "react-router-dom";
import theme from "../theme";
import Greetings from "./Greetings";
import {PincodesInput} from "./input-components/Inputs";

export default function App(): JSX.Element {
  return (
    // Setup theme and css baseline for the Material-UI app
    // https://material-ui.com/customization/theming/
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          backgroundColor: (theme) => theme.palette.background.default,
        }}
      >
        <main>
          {/* This is where your app content should go */}
          <Router>
            <Switch>             
              <Route path="/business">
                <h1>Yay! Business works!!!</h1>   
                <form>
                <PincodesInput></PincodesInput>           
                </form>  
              </Route>
              <Route path="/">
                <Link to="/business">Load Business</Link>
                <Greetings />
              </Route>
            </Switch>
          </Router>
          
        </main>
      </Box>
    </ThemeProvider>
  );
}
