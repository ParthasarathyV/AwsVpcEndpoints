import React from 'react';

const frequencyIntervalOptionsHourly = [1, 2, 3, 4, 6, 8, 12]; // Sample options for "hourly" frequency
const frequencyIntervalOptionsDaily = ['NA']; // Frequency intervals for "daily" frequency (set to "NA")

const frequencyIntervalOptionsWeekly = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const frequencyIntervalOptionsMonthly = [
  'First day of the month',
  'Last day of the month',
  '2nd of the month',
  '3rd of the month',
  '4th of the month',
  '5th of the month',
  '6th of the month',
  '7th of the month',
  '8th of the month',
  '9th of the month',
  '10th of the month',
  '11th of the month',
  '12th of the month',
  '13th of the month',
  '14th of the month',
  '15th of the month',
  '16th of the month',
  '17th of the month',
  '18th of the month',
  '19th of the month',
  '20th of the month',
  '21st of the month',
  '22nd of the month',
  '23rd of the month',
  '24th of the month',
  '25th of the month',
  '26th of the month',
  '27th of the month',
  '28th of the month'
];

const BackupScheduleTable = ({ policies }) => {
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
          {policies.map((policy) => (
            <tr key={policy.id}>
              <td>{policy.frequencyType}</td>
              <td>
                {policy.frequencyType === 'hourly' && (
                  <select value={policy.frequencyInterval}>
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
                  <select value={policy.frequencyInterval}>
                    {frequencyIntervalOptionsWeekly.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                {policy.frequencyType === 'monthly' && (
                  <select value={policy.frequencyInterval}>
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
    </div>
  );
};

const App = () => {
  const jsonData = {
    // ... (paste the JSON content here)
  };

  const policies = jsonData.policies[0].policyItems;

  return (
    <div>
      <BackupScheduleTable policies={policies} />
    </div>
  );
};

export default App;
