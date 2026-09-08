import PageTop from "../components/PageTop"

const Dashboard = () => {
    return (
        <div>
            <PageTop title="Dashboard" />
            <div>
                <div>
                    <p>Total Revenue</p>
                    <h2>$0.00</h2>
                </div>
                <div>
                    <p>Total Orders</p>
                    <h2>0</h2>
                </div>
                <div>
                    <p>Total Customers</p>
                    <h2>0</h2>
                </div>
                <div>
                    <p>Total Products</p>
                    <h2>0</h2>
                </div>
            </div>
            <div>
                <div>
                    <h2>Recent Orders</h2>
                    <p></p>
                    <button>View All</button>
                </div>
                <div>

                </div>
            </div>
        </div>
    )
}

export default Dashboard