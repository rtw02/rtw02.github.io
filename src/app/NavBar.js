import "./globals.css";
import React from 'react';
import Link from 'next/link';

const Navbar = () => {
    return (
        <nav className="navbar" role="navigation">
            <div className="navbar-left">
            <a href="/" className="logo">
                Ryan Wong
            </a>
            </div>
            <div className="navbar-center">
            <ul className="nav-links">
                <li>
                <a href="/experience">Experience</a>
                </li>
                <li>
                <a href="/projects">Projects</a>
                </li>
                <li>
                <a href="/portfolio">Portfolio</a>
                </li>
            </ul>
            </div>
        </nav>
    );
};

export default Navbar;