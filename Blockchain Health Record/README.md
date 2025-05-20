# MediChain: Blockchain-Based Electronic Health Record System

MediChain is a lightweight Electronic Health Record (EHR) application that simulates a blockchain-based system for secure medical record management. The application allows patients to upload, view, and share their medical records with healthcare providers while maintaining control over their data.

## Features

- **MetaMask Authentication**: Secure login using Ethereum wallet addresses
- **Patient Portal**: Upload medical records, manage doctor access, and view personal health data
- **Doctor Portal**: View and manage patient records with proper authorization
- **Blockchain Simulation**: Immutable record tracking with cryptographic verification
- **Role-Based Access Control**: Different permissions for patients and doctors
- **File Management**: Upload, view, and download medical files (PDF, PNG, JPG, GIF)
- **Cross-Platform Compatibility**: Works on Windows, macOS, and Linux

## Technology Stack

- **Frontend**: React.js, TailwindCSS, shadcn/ui components
- **Backend**: Node.js, Express.js
- **Authentication**: MetaMask Web3.js
- **Storage**: Local file system (simulated blockchain)
- **Build Tools**: Vite, TypeScript

## Prerequisites

- Node.js (v18+)
- NPM or Yarn
- MetaMask browser extension
- Modern web browser (Chrome, Firefox, Edge)

## Installation

### Quick Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/medichain.git
   cd medichain
   ```

2. Install dependencies
   ```bash
   npm install
   npm install -g win-node-env
   ```

3. Run the setup script to create necessary directories
   ```bash
   node setup.js
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5000`

### Manual Setup

If the quick setup doesn't work for your environment, follow these steps:

1. Clone the repository and install dependencies as above

2. Create the required directories manually:
   ```bash
   mkdir -p data uploads
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   # Server configuration
   PORT=5000

   # Session configuration
   SESSION_SECRET=medichain-secret-key

   # Storage paths
   DATA_PATH=./data
   UPLOADS_PATH=./uploads

   # Environment
   NODE_ENV=development
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### Patient Workflow

1. **Login/Registration**:
   - Connect your MetaMask wallet
   - Register as a Patient if it's your first time

2. **Upload Medical Records**:
   - Go to "Upload Record"
   - Fill in the record details and upload the file

3. **Manage Doctor Access**:
   - Go to "Manage Access"
   - Enter the doctor's Ethereum address
   - Select records and set access duration

4. **View and Delete Records**:
   - Go to "My Records"
   - View, download, or delete your medical records

### Doctor Workflow

1. **Login/Registration**:
   - Connect your MetaMask wallet
   - Register as a Doctor if it's your first time

2. **View Patient Records**:
   - Access the records patients have shared with you
   - View and download patient medical documents
   - Manage (delete) records with proper authorization

## Security Considerations

- This application simulates blockchain functionality using cryptographic techniques
- In a production environment, consider using an actual blockchain network
- The application uses session-based authentication with MetaMask verification
- File uploads are restricted to specific formats and size limits
- All data is stored locally and is not encrypted in this demo version

## License

[MIT License](LICENSE)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request