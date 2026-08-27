const MembershipAddonsPage = () => {
  const fields = [
    "Contacts",
    "Leads",
    "Companies",
    "Compaigns",
    "Projects",
    "Deals",
    "Tasks",
    "Pipelines",
  ];

  return (
    <div className="px-8 py-6 w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl ">Membership Addons</h2>

        <button className="flex items-center gap-1 bg-red-500 text-white p-2  rounded  text-xs ">
          <span>&lt;</span> Back
        </button>
      </div>

      <div className="bg-whitep-3  rounded border border-gray-200">
        <div className="grid grid-cols-2 gap-x-10 gap-y-6">
          {fields.map((label) => (
            <div key={label}>
              <label className="block mb-2   text-xs ">
                {label} <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                placeholder="0-100"
                className="w-full h-10 border border-gray-300 rounded  text-xs  px-3 focus:outline-none focus:border-red-600"
              />

              <div className="flex items-center mt-2">
                <input type="checkbox" className="h-4 w-4" />
                <span className="ml-2 text-gray-500 text-xs ">Unlimited</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 px-2 py-6 mt-4 border-t">
          <button className="p-2  border border-gray-300 rounded  text-xs ">
            Cancel
          </button>
          <button className="p-2  bg-red-500 text-white rounded  text-xs ">
            Create New
          </button>
        </div>
      </div>

      <footer className="text-center text-xs  text-gray-500 mt-10">
        Copyright © 2025{" "}
        <span className="text-red-500  ">Preadmin</span>
        <div className="flex justify-center gap-2 mt-2 text-[#1F2020] text-xs">
          <button>About</button>
          <button>Terms</button>
          <button>Contact Us</button>
        </div>
      </footer>
    </div>
  );
};

export default MembershipAddonsPage;
