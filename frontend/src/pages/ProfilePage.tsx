import React from 'react'

const ProfilePage: React.FC = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          User Profile
        </h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Account Information
              </h3>
              <p className="text-gray-600">
                Manage your account settings and preferences.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generation History
              </h3>
              <p className="text-gray-600">
                View and manage your previously generated novels:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                <li>Access completed novels</li>
                <li>Resume interrupted generations</li>
                <li>Download previous works</li>
                <li>Delete unwanted projects</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Preferences
              </h3>
              <p className="text-gray-600">
                Customize your novel generation experience:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                <li>Default genre preferences</li>
                <li>Writing style settings</li>
                <li>Notification preferences</li>
                <li>Export format preferences</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
