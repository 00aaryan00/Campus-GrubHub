import React from 'react';
import { FaLightbulb, FaCode, FaDatabase, FaUserShield, FaMobileAlt, FaUtensils, FaChartLine, FaBell } from 'react-icons/fa';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section - Black Header */}
      <div className="bg-black text-white py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 mix-blend-overlay"></div>
        </div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-400">
            About Campus GrubHub
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-300">
            Revolutionizing campus dining through real-time interaction and feedback
          </p>
          
          {/* Single Quote in Header */}
          <div className="mt-10 max-w-2xl mx-auto">
            <p className="text-lg italic text-gray-200 font-medium">
              "Built with chai, code, and campus cravings."
            </p>
          </div>
          
          <div className="mt-8 flex justify-center">
            <div className="w-24 h-1 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Our Story Section */}
      <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 transform transition-all hover:shadow-2xl">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
            <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white mr-4">
              1
            </span>
            Our Story
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Campus GrubHub was born from a simple idea to transform how students interact with campus dining. What began as a concept to streamline food feedback has grown into a comprehensive platform connecting students, cafeterias, and administrators.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                This project was ideated by <span className="font-semibold text-indigo-600">Aryan Verma</span>, who envisioned a centralized platform for real-time food interactions on campus. The system was then planned, expanded, and collaboratively built into a full-fledged web app by <span className="font-semibold text-indigo-600">Anshi Gupta</span> and <span className="font-semibold text-indigo-600">Aryan Verma</span>.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative group">
                <img 
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60" 
                  alt="Team collaboration" 
                  className="rounded-xl shadow-lg w-full h-auto max-h-80 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center flex flex-col items-center">
          <span className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white mb-4">
            2
          </span>
          Meet The Team
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Aryan's Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl mr-6">
                  <FaLightbulb />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Aryan Verma</h3>
                  <p className="text-indigo-600 font-medium">Project Ideator & Co-developer</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "Originated the core concept for Campus GrubHub",
                  "Handled project initialization and libraries",
                  "Developed admin dashboard and login system",
                  "Created Aunty's Cafe interface",
                  "Solved critical system loopholes"
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-indigo-500 mr-3 mt-1">
                      <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                        <circle cx="3" cy="3" r="3" />
                      </svg>
                    </span>
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Anshi's Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl mr-6">
                  <FaCode />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Anshi Gupta</h3>
                  <p className="text-indigo-600 font-medium">Lead Developer</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "Implemented Firebase authentication and database",
                  "Developed core application pages",
                  "Created Google sign-in system",
                  "Built pre-order module and notifications",
                  "Implemented analytics features"
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-indigo-500 mr-3 mt-1">
                      <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                        <circle cx="3" cy="3" r="3" />
                      </svg>
                    </span>
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 transform transition-all hover:shadow-2xl">
          <h2 className="text-3xl font-bold text-gray-800 mb-12 flex items-center">
            <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white mr-4">
              3
            </span>
            Our Vision
          </h2>
          <p className="text-lg text-gray-600 mb-12 max-w-4xl leading-relaxed">
            Campus GrubHub aims to bridge the gap between students and campus dining services by providing innovative solutions that enhance the dining experience for everyone.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <FaDatabase className="text-xl" />,
                title: "Real-time Feedback",
                description: "Instant like/dislike system for continuous menu improvement."
              },
              {
                icon: <FaChartLine className="text-xl" />,
                title: "Data Analytics",
                description: "Powerful insights for cafeteria management and planning."
              },
              {
                icon: <FaBell className="text-xl" />,
                title: "Seamless Ordering",
                description: "Pre-order system with status updates and notifications."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl shadow-md border border-gray-100 transition-all hover:shadow-lg hover:border-indigo-100 hover:-translate-y-1">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Campus GrubHub
          </h3>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8">
            Transforming campus dining experiences through innovative technology and real-time feedback systems.
          </p>
          <div className="flex justify-center space-x-6 mb-8">
            {[FaUtensils, FaMobileAlt, FaChartLine].map((Icon, index) => (
              <div key={index} className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors">
                <Icon />
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm">© 2025 Campus GrubHub Team. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;