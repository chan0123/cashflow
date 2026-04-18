import React, { useState, useMemo } from 'react';
import { Calculator, DollarSign, Percent, Home, PieChart, TrendingUp, Wallet, AlertCircle, ChevronDown, ChevronUp, Settings } from 'lucide-react';

const InputGroup = ({ label, name, value, suffix, prefix, step = "1", hasSlider, sliderMin = "0", sliderMax = "100", sliderStep = "1", onChange }) => (
  <div className="flex flex-col space-y-1 mb-4">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <div className="relative rounded-md shadow-sm">
      {prefix && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-slate-500 sm:text-sm">{prefix}</span>
        </div>
      )}
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        step={step}
        className={`focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border outline-none ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-8' : ''}`}
      />
      {suffix && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-slate-500 sm:text-sm">{suffix}</span>
        </div>
      )}
    </div>
    {hasSlider && (
      <div className="pt-2 px-1">
        <input
          type="range"
          name={name}
          value={value === '' ? 0 : value}
          onChange={onChange}
          min={sliderMin}
          max={sliderMax}
          step={sliderStep}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>
    )}
  </div>
);

export default function App() {
  // --- STATE ---
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hoveredBarId, setHoveredBarId] = useState(null);
  const [inputs, setInputs] = useState({
    // Purchase & Financing
    purchasePrice: 1000000,
    downPaymentPercent: 25,
    interestRate: 6.5,
    loanTermYears: 30,
    closingCosts: 6000,
    repairCosts: 15000,
    
    // Income
    monthlyRent: 4000,
    otherIncome: 0,
    
    // Expenses
    propertyTaxPercent: 1.1,
    insuranceAnnual: 1500,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    
    // Variable Expenses (Percentages of Rent)
    vacancyPercent: 0,
    maintenancePercent: 0,
    capexPercent: 0,
    managementPercent: 0,
  });

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Allow empty string to easily clear the input
    const parsedValue = value === '' ? '' : parseFloat(value);
    setInputs((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const getVal = (val) => (val === '' || isNaN(val) ? 0 : val);

  // --- CALCULATIONS ---
  const results = useMemo(() => {
    // Basic vals
    const price = getVal(inputs.purchasePrice);
    const downPayment = price * (getVal(inputs.downPaymentPercent) / 100);
    const loanAmount = price - downPayment;
    const initialInvestment = downPayment + getVal(inputs.closingCosts) + getVal(inputs.repairCosts);

    // Mortgage Calculation (P&I)
    let monthlyMortgage = 0;
    let firstMonthInterest = 0;
    let firstMonthPrincipal = 0;
    const rate = getVal(inputs.interestRate) / 100 / 12;
    const payments = getVal(inputs.loanTermYears) * 12;
    if (rate > 0 && payments > 0 && loanAmount > 0) {
      monthlyMortgage = (loanAmount * rate * Math.pow(1 + rate, payments)) / (Math.pow(1 + rate, payments) - 1);
      firstMonthInterest = loanAmount * rate;
      firstMonthPrincipal = monthlyMortgage - firstMonthInterest;
    } else if (payments > 0 && loanAmount > 0) {
      monthlyMortgage = loanAmount / payments; // 0% interest edge case
      firstMonthPrincipal = monthlyMortgage;
    }

    // Income
    const totalMonthlyIncome = getVal(inputs.monthlyRent) + getVal(inputs.otherIncome);

    // Fixed Expenses
    const annualTaxes = price * (getVal(inputs.propertyTaxPercent) / 100);
    const monthlyTaxes = annualTaxes / 12;
    const monthlyInsurance = getVal(inputs.insuranceAnnual) / 12;
    const fixedExpenses = monthlyTaxes + monthlyInsurance + getVal(inputs.hoaMonthly) + getVal(inputs.utilitiesMonthly);

    // Variable Expenses
    const monthlyVacancy = totalMonthlyIncome * (getVal(inputs.vacancyPercent) / 100);
    const monthlyMaintenance = totalMonthlyIncome * (getVal(inputs.maintenancePercent) / 100);
    const monthlyCapEx = totalMonthlyIncome * (getVal(inputs.capexPercent) / 100);
    const monthlyManagement = totalMonthlyIncome * (getVal(inputs.managementPercent) / 100);
    const variableExpenses = monthlyVacancy + monthlyMaintenance + monthlyCapEx + monthlyManagement;

    // Totals & Metrics
    const operatingExpenses = fixedExpenses + variableExpenses;
    const totalMonthlyExpenses = operatingExpenses + monthlyMortgage;
    const monthlyNOI = totalMonthlyIncome - operatingExpenses;
    const annualNOI = monthlyNOI * 12;
    
    const monthlyCashFlow = totalMonthlyIncome - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    const cashOnCashReturn = initialInvestment > 0 ? (annualCashFlow / initialInvestment) * 100 : 0;
    const capRate = price > 0 ? (annualNOI / price) * 100 : 0;

    // Breakeven Rent: rent where cash flow = 0
    // (rent + otherIncome)(1 - variableRate) = fixedExpenses + mortgage
    const variableRate = (getVal(inputs.vacancyPercent) + getVal(inputs.maintenancePercent) + getVal(inputs.capexPercent) + getVal(inputs.managementPercent)) / 100;
    const breakevenRent = variableRate < 1
      ? (fixedExpenses + monthlyMortgage) / (1 - variableRate) - getVal(inputs.otherIncome)
      : null;

    // Breakeven Rent: rent where total return = 0
    // Total return = cash flow + principal = 0 means covering interest + operating expenses only
    const breakevenRentTotalReturn = variableRate < 1
      ? (fixedExpenses + firstMonthInterest) / (1 - variableRate) - getVal(inputs.otherIncome)
      : null;

    // Breakeven Down Payment: down payment % where cash flow = 0
    // Solve for loan amount where mortgage payment = monthlyNOI
    let breakevenDownPaymentPercent = null;
    if (monthlyNOI > 0 && payments > 0 && price > 0) {
      const mortgageFactor = rate > 0
        ? (rate * Math.pow(1 + rate, payments)) / (Math.pow(1 + rate, payments) - 1)
        : 1 / payments;
      const breakevenLoan = monthlyNOI / mortgageFactor;
      breakevenDownPaymentPercent = Math.max(0, Math.min(100, ((price - breakevenLoan) / price) * 100));
    }

    // Breakeven Down Payment: down payment % where total return = 0
    // Total return = 0 means interest = monthlyNOI → loanAmount = monthlyNOI / rate
    // At 0% interest total return is unaffected by down payment, so N/A
    let breakevenDownPaymentPercentTotalReturn = null;
    if (monthlyNOI > 0 && rate > 0 && price > 0) {
      const breakevenLoan = monthlyNOI / rate;
      breakevenDownPaymentPercentTotalReturn = Math.max(0, Math.min(100, ((price - breakevenLoan) / price) * 100));
    }

    return {
      loanAmount,
      downPayment,
      initialInvestment,
      monthlyMortgage,
      firstMonthPrincipal,
      firstMonthInterest,
      totalMonthlyIncome,
      operatingExpenses,
      totalMonthlyExpenses,
      monthlyNOI,
      annualNOI,
      monthlyCashFlow,
      annualCashFlow,
      cashOnCashReturn,
      capRate,
      breakevenRent,
      breakevenRentTotalReturn,
      breakevenDownPaymentPercent,
      breakevenDownPaymentPercentTotalReturn,
      breakdown: {
        mortgage: monthlyMortgage,
        taxes: monthlyTaxes,
        insurance: monthlyInsurance,
        hoa: getVal(inputs.hoaMonthly),
        utilities: getVal(inputs.utilitiesMonthly),
        vacancy: monthlyVacancy,
        maintenance: monthlyMaintenance,
        capex: monthlyCapEx,
        management: monthlyManagement,
      }
    };
  }, [inputs]);

  // --- FORMATTERS ---
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  const formatPercent = (val) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val / 100);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Real Estate Cash Flow Calculator</h1>
            <p className="text-sm text-slate-500">Analyze rental property investment returns.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Basic Details */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center space-x-2">
                <Home className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-800">Basic Details</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <InputGroup label="Purchase Price" name="purchasePrice" value={inputs.purchasePrice} prefix="$" step="5000" hasSlider sliderMin="50000" sliderMax="5000000" sliderStep="1000"  onChange={handleInputChange}/>
                  <InputGroup label="Down Payment" name="downPaymentPercent" value={inputs.downPaymentPercent} suffix="%" step="5" hasSlider sliderStep="5"  onChange={handleInputChange}/>
                  <InputGroup label="Interest Rate" name="interestRate" value={inputs.interestRate} suffix="%" step="0.1" hasSlider sliderMin="0" sliderMax="15" sliderStep="0.01"  onChange={handleInputChange}/>
                  <InputGroup label="Gross Monthly Rent" name="monthlyRent" value={inputs.monthlyRent} prefix="$" step="50" hasSlider sliderMin="0" sliderMax="20000" sliderStep="10"  onChange={handleInputChange}/>
                  <InputGroup label="Property Tax Rate" name="propertyTaxPercent" value={inputs.propertyTaxPercent} suffix="%" step="0.1" hasSlider sliderMin="0" sliderMax="5" sliderStep="0.01"  onChange={handleInputChange}/>
                  <InputGroup label="Insurance (Annual)" name="insuranceAnnual" value={inputs.insuranceAnnual} prefix="$" step="50" hasSlider sliderMin="0" sliderMax="10000" sliderStep="10"  onChange={handleInputChange}/>
                </div>
              </div>
            </div>

            {/* Advanced Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-slate-500" />
                <span className="font-semibold text-lg">Advanced Options</span>
              </div>
              {showAdvanced ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>

            {/* Advanced Inputs */}
            {showAdvanced && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-8">
                  {/* Advanced Financing */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider border-b border-slate-100 pb-2">Acquisition & Financing</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <InputGroup label="Loan Term" name="loanTermYears" value={inputs.loanTermYears} suffix="Yrs" step="5"  onChange={handleInputChange}/>
                      <InputGroup label="Closing Costs" name="closingCosts" value={inputs.closingCosts} prefix="$" step="500"  onChange={handleInputChange}/>
                      <InputGroup label="Repair/Rehab Costs" name="repairCosts" value={inputs.repairCosts} prefix="$" step="500"  onChange={handleInputChange}/>
                    </div>
                  </div>

                  {/* Advanced Income & Fixed Expenses */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider border-b border-slate-100 pb-2">Additional Income & Fees</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <InputGroup label="Other Monthly Income" name="otherIncome" value={inputs.otherIncome} prefix="$" step="50"  onChange={handleInputChange}/>
                      <InputGroup label="HOA Fees (Monthly)" name="hoaMonthly" value={inputs.hoaMonthly} prefix="$" step="10"  onChange={handleInputChange}/>
                      <InputGroup label="Utilities (Monthly)" name="utilitiesMonthly" value={inputs.utilitiesMonthly} prefix="$" step="10"  onChange={handleInputChange}/>
                    </div>
                  </div>

                  {/* Variable Expenses */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider border-b border-slate-100 pb-2">Variable Expenses (% of Rent)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      <InputGroup label="Vacancy Rate" name="vacancyPercent" value={inputs.vacancyPercent} suffix="%" step="1"  onChange={handleInputChange}/>
                      <InputGroup label="Maintenance & Repairs" name="maintenancePercent" value={inputs.maintenancePercent} suffix="%" step="1"  onChange={handleInputChange}/>
                      <InputGroup label="Capital Expenditures" name="capexPercent" value={inputs.capexPercent} suffix="%" step="1"  onChange={handleInputChange}/>
                      <InputGroup label="Property Management" name="managementPercent" value={inputs.managementPercent} suffix="%" step="1"  onChange={handleInputChange}/>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 space-y-6">
              
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                {/* Hero Result */}
                <div className={`p-8 text-center ${results.monthlyCashFlow >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                  <h3 className="text-emerald-100/80 font-medium mb-1 flex items-center justify-center space-x-1">
                    <Wallet className="h-4 w-4" />
                    <span>Monthly Cash Flow</span>
                  </h3>
                  <div className="text-5xl font-bold tracking-tight">
                    {formatCurrency(results.monthlyCashFlow)}
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-px bg-slate-200">
                  <div className="bg-white p-4 text-center">
                    <div className="text-sm text-slate-500 mb-1">Cash on Cash ROI</div>
                    <div className={`text-xl font-bold ${results.cashOnCashReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatPercent(results.cashOnCashReturn)}
                    </div>
                  </div>
                  <div className="bg-white p-4 text-center">
                    <div className="text-sm text-slate-500 mb-1">Cap Rate</div>
                    <div className="text-xl font-bold text-slate-800">
                      {formatPercent(results.capRate)}
                    </div>
                  </div>
                  <div className="bg-white p-4 text-center">
                    <div className="text-sm text-slate-500 mb-1">Net Operating Income</div>
                    <div className="text-xl font-bold text-slate-800">
                      {formatCurrency(results.annualNOI)}
                      <span className="text-xs text-slate-400 font-normal ml-1">/yr</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 text-center">
                    <div className="text-sm text-slate-500 mb-1">Total Cash Needed</div>
                    <div className="text-xl font-bold text-indigo-600">
                      {formatCurrency(results.initialInvestment)}
                    </div>
                  </div>
                  <div className="bg-white p-4 text-center">
                    <div className="text-xs text-slate-400 mb-0.5">Breakeven rent for cashflow</div>
                    <div className="text-xl font-bold text-slate-800">
                      {results.breakevenRent !== null ? formatCurrency(results.breakevenRent) : 'N/A'}
                    </div>
                    <div className="text-xs text-slate-400 mt-2 mb-0.5">Breakeven rent for total return</div>
                    <div className="text-base font-semibold text-slate-600">
                      {results.breakevenRentTotalReturn !== null ? formatCurrency(results.breakevenRentTotalReturn) : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-white p-4 text-center">
                    <div className="text-xs text-slate-400 mb-0.5">Breakeven down pmt for cashflow</div>
                    <div className="text-xl font-bold text-slate-800">
                      {results.breakevenDownPaymentPercent !== null ? formatPercent(results.breakevenDownPaymentPercent) : 'N/A'}
                    </div>
                    <div className="text-xs text-slate-400 mt-2 mb-0.5">Breakeven down pmt for total return</div>
                    <div className="text-base font-semibold text-slate-600">
                      {results.breakevenDownPaymentPercentTotalReturn !== null ? formatPercent(results.breakevenDownPaymentPercentTotalReturn) : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="p-6 border-t border-slate-100">
                  <h4 className="font-semibold text-slate-800 mb-4 flex items-center">
                    <PieChart className="h-4 w-4 mr-2 text-slate-400" />
                    Monthly Breakdown
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Gross Income</span>
                      <span className="font-medium text-slate-900">{formatCurrency(results.totalMonthlyIncome)}</span>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Mortgage Total</span>
                        <span className="font-medium text-rose-600">-{formatCurrency(results.monthlyMortgage)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pl-4">
                        <div className="flex items-center text-slate-500"><span className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></span>Principal</div>
                        <span className="text-rose-500/80">-{formatCurrency(results.firstMonthPrincipal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pl-4">
                        <div className="flex items-center text-slate-500"><span className="w-2 h-2 rounded-full bg-indigo-400 mr-2"></span>Interest</div>
                        <span className="text-rose-500/80">-{formatCurrency(results.firstMonthInterest)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Operating Expenses</span>
                        <span className="font-medium text-rose-600">-{formatCurrency(results.operatingExpenses)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pl-4">
                        <div className="flex items-center text-slate-500"><span className="w-2 h-2 rounded-full bg-rose-500 mr-2"></span>Taxes</div>
                        <span className="text-rose-500/80">-{formatCurrency(results.breakdown.taxes)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pl-4">
                        <div className="flex items-center text-slate-500"><span className="w-2 h-2 rounded-full bg-orange-400 mr-2"></span>Insurance</div>
                        <span className="text-rose-500/80">-{formatCurrency(results.breakdown.insurance)}</span>
                      </div>
                      {(results.breakdown.hoa + results.breakdown.utilities > 0) && (
                        <div className="flex justify-between items-center text-xs pl-4">
                          <div className="flex items-center text-slate-500"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>HOA & Utilities</div>
                          <span className="text-rose-500/80">-{formatCurrency(results.breakdown.hoa + results.breakdown.utilities)}</span>
                        </div>
                      )}
                      {(results.breakdown.vacancy + results.breakdown.maintenance + results.breakdown.capex + results.breakdown.management > 0) && (
                        <div className="flex justify-between items-center text-xs pl-4">
                          <div className="flex items-center text-slate-500"><span className="w-2 h-2 rounded-full bg-sky-500 mr-2"></span>Variable Expenses</div>
                          <span className="text-rose-500/80">-{formatCurrency(results.breakdown.vacancy + results.breakdown.maintenance + results.breakdown.capex + results.breakdown.management)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t border-slate-200 my-2 pt-3 flex justify-between items-center font-semibold text-sm">
                      <span className="text-slate-800">Cash Flow</span>
                      <span className={results.monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {formatCurrency(results.monthlyCashFlow)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">+ Principal Paydown</span>
                      <span className="font-medium text-emerald-600">+{formatCurrency(results.firstMonthPrincipal)}</span>
                    </div>
                    <div className="border-t border-slate-200 my-2 pt-3 flex justify-between items-center font-semibold text-sm">
                      <span className="text-slate-800">Total Return</span>
                      <span className={results.monthlyCashFlow + results.firstMonthPrincipal >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {formatCurrency(results.monthlyCashFlow + results.firstMonthPrincipal)}
                      </span>
                    </div>
                  </div>

                  {/* Expense Bar Visualization */}
                  <div className="mt-6">
                    {(() => {
                      const totalBasis = Math.max(results.totalMonthlyIncome, results.totalMonthlyExpenses) || 1;
                      
                      const segments = [
                        { id: 'principal', label: 'Principal', value: results.firstMonthPrincipal, bg: 'bg-indigo-600' },
                        { id: 'interest', label: 'Interest', value: results.firstMonthInterest, bg: 'bg-indigo-400' },
                        { id: 'taxes', label: 'Taxes', value: results.breakdown.taxes, bg: 'bg-rose-500' },
                        { id: 'insurance', label: 'Insurance', value: results.breakdown.insurance, bg: 'bg-orange-400' },
                        { id: 'hoa_util', label: 'HOA & Util', value: results.breakdown.hoa + results.breakdown.utilities, bg: 'bg-yellow-500' },
                        { id: 'variable', label: 'Variable', value: results.breakdown.vacancy + results.breakdown.maintenance + results.breakdown.capex + results.breakdown.management, bg: 'bg-sky-500' },
                      ];

                      if (results.monthlyCashFlow > 0) {
                        segments.push({ id: 'profit', label: 'Profit', value: results.monthlyCashFlow, bg: 'bg-emerald-500' });
                      }

                      const activeSegments = segments.filter(s => s.value > 0);
                      const hoveredData = activeSegments.find(s => s.id === hoveredBarId);

                      return (
                        <>
                          <div className="flex justify-between items-end mb-2">
                            <div className="text-xs font-medium text-slate-500">Where does the money go?</div>
                            <div className="text-xs font-semibold text-slate-700 h-4">
                              {hoveredData ? (
                                <span>{hoveredData.label}: {formatCurrency(hoveredData.value)} ({(hoveredData.value / totalBasis * 100).toFixed(1)}%)</span>
                              ) : null}
                            </div>
                          </div>
                          
                          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex cursor-pointer">
                            {activeSegments.map(seg => (
                              <div 
                                key={seg.id} 
                                style={{ width: `${(seg.value / totalBasis) * 100}%` }} 
                                className={`${seg.bg} transition-opacity duration-200 ${hoveredBarId && hoveredBarId !== seg.id ? 'opacity-30' : 'opacity-100'}`}
                                onMouseEnter={() => setHoveredBarId(seg.id)}
                                onMouseLeave={() => setHoveredBarId(null)}
                              ></div>
                            ))}
                          </div>
                          
                          <div className="flex flex-wrap text-xs mt-3 gap-x-3 gap-y-2">
                            {activeSegments.map((seg) => (
                              <div 
                                key={seg.id} 
                                className={`flex items-center cursor-pointer transition-opacity duration-200 ${hoveredBarId && hoveredBarId !== seg.id ? 'opacity-40' : 'opacity-100'}`}
                                onMouseEnter={() => setHoveredBarId(seg.id)}
                                onMouseLeave={() => setHoveredBarId(null)}
                              >
                                <span className={`w-2 h-2 rounded-full ${seg.bg} mr-1 flex-shrink-0`}></span> {seg.label}
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}