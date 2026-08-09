import { Check, X } from 'lucide-react';

type CellValue = 'check' | 'x' | (string & {});

type ComparisonTableProps = {
  firstColumnHeader: string;
  data: {
    feature: string;
    pro: CellValue;
    team: CellValue;
  }[];
};

const ComparisonTable = ({ firstColumnHeader, data }: ComparisonTableProps) => {
  const renderCell = (value: CellValue) => {
    if (value === 'check') {
      return <Check className="mx-auto h-4 w-4 text-muted-foreground" />;
    }
    if (value === 'x') {
      return <X className="mx-auto h-4 w-4 text-red-500" />;
    }
    return (
      <span className="block text-center text-muted-foreground text-sm">
        {value}
      </span>
    );
  };

  return (
    <div className="mb-8">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b">
              <th className="w-1/3 px-4 py-3 text-left font-medium">
                {firstColumnHeader}
              </th>
              <th className="w-1/3 px-4 py-3 text-center font-medium">Pro</th>
              <th className="w-1/3 px-4 py-3 text-center font-medium">Team</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                className="border-gray-100 border-b"
                key={`${row.feature}-${index}`}
              >
                <td className="w-1/3 px-4 py-3 text-sm">{row.feature}</td>
                <td className="w-1/3 px-4 py-3">{renderCell(row.pro)}</td>
                <td className="w-1/3 px-4 py-3">{renderCell(row.team)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const devicePlatformData = [
  {
    feature: 'Desktop macOS',
    pro: 'check' as const,
    team: 'check' as const,
  },
  {
    feature: 'Desktop Windows',
    pro: 'check' as const,
    team: 'check' as const,
  },
  {
    feature: 'iPhone',
    pro: 'Coming soon',
    team: 'Coming soon',
  },
  {
    feature: 'Android',
    pro: 'Coming soon',
    team: 'Coming soon',
  },
];

const coreDictationData = [
  {
    feature: 'Dictation limit',
    pro: 'Unlimited',
    team: 'Unlimited (per seat)',
  },
  {
    feature: 'Priority processing',
    pro: 'check' as const,
    team: 'check' as const,
  },
  {
    feature: 'Advanced custom dictionary',
    pro: 'check' as const,
    team: 'check' as const,
  },
  {
    feature: 'Desktop shortcuts & workflows',
    pro: 'check' as const,
    team: 'check' as const,
  },
];

const teamCollaborationData = [
  {
    feature: 'Invite teammates',
    pro: 'x' as const,
    team: 'check' as const,
  },
  {
    feature: 'Seat management & billing',
    pro: 'x' as const,
    team: 'check' as const,
  },
  {
    feature: 'Shared dictionaries',
    pro: 'x' as const,
    team: 'check' as const,
  },
  {
    feature: 'Priority support',
    pro: 'check' as const,
    team: 'check' as const,
  },
];

export const PlanComparison = () => {
  return (
    <div className="mt-16">
      <div className="mb-12">
        <h2 className="mb-2 font-medium text-2xl">Plans and Features</h2>
        <p className="text-muted-foreground">
          Compare what's included in each plan
        </p>
      </div>

      <ComparisonTable
        data={coreDictationData}
        firstColumnHeader="Effortless Voice Typing"
      />
      <ComparisonTable
        data={teamCollaborationData}
        firstColumnHeader="Support"
      />
      <ComparisonTable
        data={devicePlatformData}
        firstColumnHeader="Device and Platform"
      />
    </div>
  );
};
