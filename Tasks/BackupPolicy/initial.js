import React, { useState } from 'react';

const frequencyTypes = ['hourly', 'daily', 'weekly', 'monthly'];
const frequencyIntervalOptionsHourly = [1, 2, 3, 4, 6, 8, 12];
const frequencyIntervalOptionsWeekly = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const frequencyIntervalOptionsMonthly = ['First day of the month', 'Last day of the month', '2nd of the month', /* ... */];
const retentionUnits = ['days', 'weeks', 'months'];

const BackupScheduleTable = ({ policies, onAddRow, onDeleteRow, isEditMode, onToggleEditMode }) => {
  // Define a function to conditionally render the fields based on edit mode
  const renderFields = () => {
    return policies.map((policy, index) => (
      <tr key={policy.id}>
        <td>
          <select
            value={policy.frequencyType}
            onChange={(e) => onAddRow(e, index, 'frequencyType')}
            disabled={!isEditMode} // Disable the field when not in edit mode
          >
            {frequencyTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </td>
        <td>
          {policy.frequencyType === 'hourly' && (
            <select
              value={policy.frequencyInterval}
              onChange={(e) => onAddRow(e, index, 'frequencyInterval')}
              disabled={!isEditMode} // Disable the field when not in edit mode
            >
              {frequencyIntervalOptionsHourly.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
          {/* Add similar conditional rendering for other frequency types */}
        </td>
        <td>
          <input
            type="text"
            value={policy.retentionUnit}
            onChange={(e) => onAddRow(e, index, 'retentionUnit')}
            disabled={!isEditMode} // Disable the field when not in edit mode
          />
        </td>
        <td>
          <select
            value={policy.retentionValue}
            onChange={(e) => onAddRow(e, index, 'retentionValue')}
            disabled={!isEditMode} // Disable the field when not in edit mode
          >
            {retentionUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </td>
        <td>
          <button onClick={() => onDeleteRow(index)} disabled={isEditMode}>
            Delete
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div>
      <h2>Backup Schedule</h2>
      <table>
        <thead>
          <tr>
            <th>Frequency Type</th>
            <th>Frequency Interval</th>
            <th>Retention Unit</th>
            <th>Retention Value</th>
            <th></th>
          </tr>
        </thead>
        <tbody>{renderFields()}</tbody>
      </table>
      <button onClick={onToggleEditMode}>
        {isEditMode ? 'Save' : 'Edit'} {/* Change button text based on edit mode */}
      </button>
      <button onClick={() => onAddRow(null, null, null)} disabled={isEditMode}>
        Add Row
      </button>
    </div>
  );
};

const App = () => {
  const initialPolicies = [
    // Initial policies data here
  ];

  const [policies, setPolicies] = useState(initialPolicies);
  const [isEditMode, setIsEditMode] = useState(false); // State to track edit mode

  const handleAddRow = (e, index, field) => {
    const updatedPolicies = [...policies];

    if (index !== null && field) {
      updatedPolicies[index][field] = e.target.value;
    }

    setPolicies(updatedPolicies);
  };

  const handleDeleteRow = (index) => {
    const updatedPolicies = [...policies];
    updatedPolicies.splice(index, 1);
    setPolicies(updatedPolicies);
  };

  const onToggleEditMode = () => {
    // Toggle edit mode when the "Edit" button is clicked
    setIsEditMode(!isEditMode);
  };

  return (
    <div>
      <BackupScheduleTable
        policies={policies}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRow}
        isEditMode={isEditMode} // Pass edit mode state as a prop
        onToggleEditMode={onToggleEditMode} // Pass the toggle function
      />
    </div>
  );
};

export default App;
