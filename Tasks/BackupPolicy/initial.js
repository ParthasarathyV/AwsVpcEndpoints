import React, { useState } from 'react';

const frequencyTypes = ['hourly', 'daily', 'weekly', 'monthly'];
const frequencyIntervalOptionsHourly = [1, 2, 3, 4, 6, 8, 12];
const frequencyIntervalOptionsDaily = ['NA'];
const frequencyIntervalOptionsWeekly = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const frequencyIntervalOptionsMonthly = ['First day of the month', 'Last day of the month', '2nd of the month', /* ... */];

const BackupScheduleTable = ({ policies, onAddRow, isNewRow }) => {
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
          </tr>
        </thead>
        <tbody>
          {policies.map((policy, index) => (
            <tr key={policy.id}>
              <td>
                {!isNewRow(index) ? (
                  policy.frequencyType
                ) : (
                  <select value={policy.frequencyType} onChange={(e) => onAddRow(e, index, 'frequencyType')}>
                    {frequencyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                )}
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
                {policy.frequencyType === 'daily' && (
                  <select value="NA" disabled>
                    <option value="NA">NA</option>
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
              <td>{policy.retentionUnit}</td>
              <td>{policy.retentionValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => onAddRow(null, null, null)}>Add Row</button>
    </div>
  );
};

const App = () => {
  const jsonData = {
    // ... (paste the JSON content here)
  };

  const initialPolicies = jsonData.policies[0].policyItems;

  const [policies, setPolicies] = useState(initialPolicies);

  const handleAddRow = (e, index, field) => {
    const updatedPolicies = [...policies];

    if (index !== null && field) {
      updatedPolicies[index][field] = e.target.value;
    }

    setPolicies(updatedPolicies);
  };

  const isNewRow = (index) => {
    return index === policies.length;
  };

  return (
    <div>
      <BackupScheduleTable policies={policies} onAddRow={handleAddRow} isNewRow={isNewRow} />
    </div>
  );
};

export default App;
