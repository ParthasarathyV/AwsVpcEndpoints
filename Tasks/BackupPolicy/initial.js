import React, { useState } from 'react';
import { inputStream } from './test'; // Import inputStream from test.js

const frequencyTypes = ['hourly', 'daily', 'weekly', 'monthly'];
const frequencyIntervalOptionsHourly = [1, 2, 3, 4, 6, 8, 12];
const frequencyIntervalOptionsWeekly = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const frequencyIntervalOptionsMonthly = ['First day of the month', 'Last day of the month', '2nd of the month', /* ... */];
const retentionUnits = ['days', 'weeks', 'months'];

const BackupScheduleTable = ({ policies, onAddRow, onDeleteRow }) => {
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
        <tbody>
          {policies.map((policy, index) => (
            <tr key={policy.id}>
              <td>
                <select value={policy.frequencyType} onChange={(e) => onAddRow(e, index, 'frequencyType')}>
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
                  >
                    {frequencyIntervalOptionsHourly.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                {policy.frequencyType === 'weekly' && (
                  <select
                    value={policy.frequencyInterval}
                    onChange={(e) => onAddRow(e, index, 'frequencyInterval')}
                  >
                    {frequencyIntervalOptionsWeekly.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                {policy.frequencyType === 'monthly' && (
                  <select
                    value={policy.frequencyInterval}
                    onChange={(e) => onAddRow(e, index, 'frequencyInterval')}
                  >
                    {frequencyIntervalOptionsMonthly.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td>
                <input
                  type="text"
                  value={policy.retentionUnit}
                  onChange={(e) => onAddRow(e, index, 'retentionUnit')}
                />
              </td>
              <td>
                <select
                  value={policy.retentionValue}
                  onChange={(e) => onAddRow(e, index, 'retentionValue')}
                >
                  {retentionUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button onClick={() => onDeleteRow(index)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => onAddRow(null, null, null)}>Add Row</button>
    </div>
  );
};

const App = () => {
  const initialPolicies = inputStream.policies[0].policyItems;

  const [policies, setPolicies] = useState(initialPolicies);

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

  return (
    <div>
      <BackupScheduleTable policies={policies} onAddRow={handleAddRow} onDeleteRow={handleDeleteRow} />
    </div>
  );
};

export default App;
