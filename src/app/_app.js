import "bootstrap/dist/css/bootstrap.min.css"; // Import bootstrap CSS
import "./globals.css";

import React from 'react';
import Link from 'next/link';

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
      <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <nav className="nav">
            <a className="nav-link active" aria-current="page" href="#">
              Projects
            </a>
            <a className="nav-link" href="#">
              Skills
            </a>
            <a className="nav-link" href="#">
              Work Experience
            </a>
          </nav>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;