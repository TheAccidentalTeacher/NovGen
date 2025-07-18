import React from 'react'

interface ToasterProps {}

export const Toaster: React.FC<ToasterProps> = () => {
  return (
    <div id="toast-container" className="fixed top-4 right-4 z-50">
      {/* Toast notifications will be rendered here */}
    </div>
  )
}

export default Toaster
