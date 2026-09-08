import PageTop from "../components/PageTop"

const Customers = () => {
    return (
        <div className="w-full h-full bg-white">
            <PageTop title="Customers" />

            <div className="w-full">
                <div className="p-4 border-b border-gray-200">
                    <h2></h2>
                    <p></p>
                    <button>Add Customer</button>
                    <button>Export CSV</button>
                    <div>
                        <input type="text" placeholder="Search Customer" />
                    </div>
                    <div>
                        <button>View Columns</button>
                    </div>
                    <div>
                        <button>Filter</button>
                    </div>
                    <div>
                        <button>Actions</button>
                    </div>
                    <div>
                        <button>Import</button>
                    </div>
                    <div>
                        <button>Refresh</button>
                    </div>
                    <div className="w-full">
                        <div className="w-full h-[calc(100vh-200px)] overflow-y-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        <th className="p-2">Name</th>
                                        <th className="p-2">Email</th>
                                        <th className="p-2">Phone</th>
                                        <th className="p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b">
                                        <td className="p-2">John Doe</td>
                                        <td className="p-2">[EMAIL_ADDRESS]</td>
                                        <td className="p-2">1234567890</td>
                                        <td className="p-2">
                                            <button>Edit</button>
                                            <button>Delete</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                        </div>
                    </div>
                    <div className="flex justify-between items-center px-2 py-2 border-t border-gray-200">
                        <div className="text-sm text-base-text">
                            Showing <span className="font-medium">0</span> to <span className="font-medium">0</span> of <span className="font-medium">0</span> results
                        </div>
                        <div>

                        </div>
                        <div>

                        </div>

                        <button>Previous</button>
                        <button>1</button>
                        <button>2</button>
                        <button>3</button>
                        <button>Next</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Customers