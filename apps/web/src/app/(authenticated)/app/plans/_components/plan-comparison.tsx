import { Check, X } from 'lucide-react';

type CellValue = 'check' | 'x' | (string & {});

interface ComparisonTableProps {
  firstColumnHeader: string;
  data: {
    feature: string;
    basic: CellValue;
    pro: CellValue;
  }[];
}

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
              <th className="w-1/3 px-4 py-3 text-center font-medium">Basic</th>
              <th className="w-1/3 px-4 py-3 text-center font-medium">Pro</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                className="border-gray-100 border-b"
                key={`${row.feature}-${index}`}
              >
                <td className="w-1/3 px-4 py-3 text-sm">{row.feature}</td>
                <td className="w-1/3 px-4 py-3">{renderCell(row.basic)}</td>
                <td className="w-1/3 px-4 py-3">{renderCell(row.pro)}</td>
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
    feature: 'Desktop Mac',
    basic: 'check' as const,
    pro: 'check' as const,
  },
  {
    feature: 'Desktop Windows',
    basic: 'check' as const,
    pro: 'check' as const,
  },
  {
    feature: 'iPhone',
    basic: 'Coming soon',
    pro: 'Coming soon',
  },
  {
    feature: 'Android',
    basic: 'Coming soon',
    pro: 'Coming soon',
  },
];

const voiceTypingData = [
  {
    feature: 'Word Limit',
    basic: '2,000 a week',
    pro: 'Unlimited',
  },
  {
    feature: 'Add Words to Dictionary',
    basic: 'check' as const,
    pro: 'check' as const,
  },
  {
    feature: 'Prioritized Feature Requests',
    basic: 'x' as const,
    pro: 'check' as const,
  },
  {
    feature: 'Early Access to New Features',
    basic: 'x' as const,
    pro: 'check' as const,
  },
];

const teamCollaborationData = [
  {
    feature: 'Customer Support',
    basic: 'Standard',
    pro: 'Prioritized',
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
        data={devicePlatformData}
        firstColumnHeader="Device and Platform"
      />
      <ComparisonTable
        data={voiceTypingData}
        firstColumnHeader="Effortless Voice Typing"
      />
      <ComparisonTable
        data={teamCollaborationData}
        firstColumnHeader="Support"
      />
    </div>
  );
};
