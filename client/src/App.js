// App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DriverRegistrationForm from './components/DriverRegistrationForm';

const NotFound = () => <h1>404 Not Found</h1>;

const App = () => {
  return (
    <Router>
      <div>
        {/* Other components or content */}
        <Routes>
          <Route path="/signup/driver" element={<DriverRegistrationForm />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* Other components or content */}
      </div>
    </Router>
  );
};

export default App;

