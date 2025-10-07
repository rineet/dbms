# ER Diagram Designer

## Project Overview

This is a web-based ER Diagram Designer application developed as a course project for the Database Management Systems course. The application provides a visual interface for designing database schemas with drag-and-drop functionality.

## Features

- **Visual Database Design**: Create and manipulate database tables through an intuitive drag-and-drop interface
- **Column Management**: Add, edit, and delete columns with support for multiple data types (TEXT, INTEGER, REAL, BOOLEAN)
- **Relationship Management**: Establish foreign key relationships between tables
- **SQL Export**: Generate CREATE TABLE and INSERT statements from the visual design
- **Mermaid ERD Export**: Export Entity-Relationship Diagrams in Mermaid markup format
- **PNG Export**: Download visual diagrams as PNG images
- **Primary Key Management**: Set and validate primary keys with uniqueness constraints
- **Data Entry**: Add sample data to tables for testing and validation

## Installation and Setup

### Prerequisites
- Node.js (v16 or higher)
- npm package manager

### Installation Steps

1. **Navigate to the project directory:**
   ```bash
   cd /path/to/your/dbms-project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open your web browser and navigate to `http://localhost:5173`

## Usage Instructions

### Creating Tables
- Click the **"+ Add Table"** button to create a new table
- Enter the table name and define columns with appropriate data types
- Optionally set a primary key from the available columns

### Designing the Schema
- **Drag tables** to reposition them in the diagram
- **Connect tables** by dragging from a column in one table to a column in another table to create foreign key relationships
- **Edit table properties** by clicking on table names or column headers

### Export Options
- **Export SQL**: Click "Export SQL" to generate SQL CREATE TABLE and INSERT statements
- **ERD (Mermaid)**: Click "ERD (Mermaid)" to get Mermaid markup for documentation
- **Download PNG**: Click "Download PNG" to export the visual diagram as an image

### Data Management
- Add sample data by clicking the "+" button in table rows
- Edit existing data by clicking on cell values
- The application automatically validates primary key uniqueness

## Technology Stack

- **React 19**: Frontend framework for building the user interface
- **ReactFlow**: Library for creating node-based UIs and interactive diagrams
- **Vite**: Build tool and development server
- **TailwindCSS**: Utility-first CSS framework for styling
- **html-to-image**: Library for exporting diagrams as PNG images

## Project Structure

```
src/
├── App.jsx          # Main application component containing the ER diagram logic
├── TableNode.jsx    # Custom React component for rendering database tables
├── main.jsx         # Application entry point
├── index.css        # Global stylesheet definitions
└── assets/          # Static assets directory
```

## Development Team

**Ankit Kumar** - Roll Number: 123CS0011
**Rineet Pandey** - Roll Number: 123CS0009

**Institution**: Indian Institute of Information Technology Design and Manufacturing Kurnool

## Course Information

**Course**: Database Management Systems
**Project Type**: Course Project
**Academic Year**: 2025-2026

## Contributing

This project was developed as part of academic coursework. For any questions or suggestions regarding the implementation, please contact the development team.

## License

This project is developed for educational purposes as part of the Database Management Systems course curriculum.
