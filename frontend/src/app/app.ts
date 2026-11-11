import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './shared/footer';
import { Navbar } from './shared/navbar';
import { Toasts } from './shared/toasts';

@Component({
  imports: [RouterOutlet, Navbar, Footer, Toasts],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
